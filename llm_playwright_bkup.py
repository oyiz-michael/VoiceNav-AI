from playwright.sync_api import sync_playwright
import boto3
import json

## We will put the problem in string in our python code.
task = """Go to https://www.sec.gov/edgar/searchedgar/companysearch. Search for Nvidia. You will see a list of links for documents. 
We need to click at each and another page will open. Copy the link for all documents. I need the output which will be all the links on that page. 
After getting links for one page go back do same for next link."""

# LLM client setup
bedrock_client = boto3.client('bedrock-runtime', region_name='us-east-1')
bedrock_model_id = "anthropic.claude-3-sonnet-20240229-v1:0"


# Function to get task list from LLM
def get_task_list(task):
    system_prompt = [
        {
            "text": """You are an AI assistant that, given a high-level task, will break it down into smaller subtasks.
                    Each subtask should be simple enough to be executed sequentially by the automation tool Playwright without using loops.
                    Write the subtasks as a numbered list.
                    Each step should be actionable and straightforward, ensuring the automation progresses sequentially as it communicates continuously with an external processor for updates.
                    Example:
                    1. Go to page XYZ.
                    2. Check for the presence of element ABC.
                    3. Fill out form DEF if it is present.
                    4. Click submit button GHI."""
        }
    ]
    print('Load the system prompt')

    body={
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1000,
        "temperature": 0.7,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"{system_prompt}\n\nWrite the task list for this task: {task}"
                    }
                ]
            }        
        ]
    }
    body_bytes = json.dumps(body).encode('utf-8')

    completion = bedrock_client.invoke_model(
        modelId=bedrock_model_id,
        body=body_bytes
    )
    print('Get the task list from LLM')

    response_body = json.loads(completion['body'].read())
    print('Response from LLM:', response_body['content'][0]['text'])
    return response_body['content'][0]['text']


# Function to determine the first URL to go to based on the task
def goto_command(task):
    system_prompt = [
        {
            "text": """I am giving you the task that needs to be executed by automation software playwright.
                    Your task is just to tell me given the task, which URL should playwright go to first.
                    Just output url and nothing else"""
        }
    ]
    print('Load the system prompt')

    body={
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1000,
        "temperature": 0.7,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"{system_prompt}\n\nWhat is the URL for this task: {task}"
                    }
                ]
            }        
        ]
    }
    body_bytes = json.dumps(body).encode('utf-8')

    completion = bedrock_client.invoke_model(
        modelId=bedrock_model_id,
        body=body_bytes
    )
    print('Get the task list from LLM')

    response_body = json.loads(completion['body'].read())
    print('Response from LLM:', response_body['content'][0]['text'])
    return response_body['content'][0]['text']    


# Function to update the task list based on the current state of execution 
def update_task_list(task, task_list, commands, page_content):
    system_prompt = [
        {
            "text": f"""You are an AI assistant that is helping update a task list based on the current state of execution. Given the original high-level task, the existing task list, the commands that have been executed, and the current page content, update the task list to reflect what still needs to be done or adjust the approach based on the page's current state.
                    Original Task: {task}\n
                    Initial Task List: {task_list}\n
                    Executed Commands: {commands}\n
                    Current Page Content: {page_content}\n
                    Based on this information, provide a revised list of subtasks, ensuring each can be executed by Playwright sequentially without loops. 
                    Adjust the tasks as needed based on the changes observed in the page content.\n"""
        }
    ]
    print('Load the system prompt')
    body={
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1000,
        "temperature": 0.7,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"{system_prompt}\n\nWrite an updated task list based on the current page content. Make the changes only if updates are required?"
                    }
                ]
            }        
        ]
    }
    body_bytes = json.dumps(body).encode('utf-8')
    completion = bedrock_client.invoke_model(
        modelId=bedrock_model_id,
        body=body_bytes
    )
    print('Get the task list from LLM')

    response_body = json.loads(completion['body'].read())
    print('Response from LLM:', response_body['content'][0]['text'])
    return response_body['content'][0]['text'] 


def get_next_command(tasks, commands, page_content):
    system_prompt = [
        {
            "text": f"""You are an assistant tasked with generating executable code snippets for Playwright and Python.
                    Output Playwright commands to perform web operations or Python commands to store web content in a list named `output_storage`. 
                    Avoid using JavaScript decorators, backticks, and the `await` keyword.
                    Task List: {task}\n
                    Executed Command Till Now: {commands}\n
                    Current Page Content: {page_content}\n
                    Based on this context, output the necessary code to complete the next step in the task list.
                    Ensure the code is suitable for sequential execution and directly interacts with `output_storage` for storing data as needed.
                    Just output the code, nothing else. Also output will be just one-line code that needs to be executed next.\n"""
        }
    ]
    print('Load the system prompt')
    body={
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1000,
        "temperature": 0.7,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"{system_prompt}\n\nWhat should be the next playwright command.?"
                    }
                ]
            }        
        ]
    }
    body_bytes = json.dumps(body).encode('utf-8')
    completion = bedrock_client.invoke_model(
        modelId=bedrock_model_id,
        body=body_bytes
    )
    print('Get the task list from LLM')

    response_body = json.loads(completion['body'].read())
    print('Response from LLM:', response_body['content'][0]['text'])
    return response_body['content'][0]['text']     


def run_playwright():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        command = ""
        url = goto_command(task)
        next_command = f"Go to {url}"
        output_storage = []
        exec(next_command)
        commands = command + "\n" + next_command

        page_content = page.content()
        page.goto('https://example.com')
        title = page.title()
        print(f'Page title: {title}')
        browser.close()

if __name__ == "__main__":
    #get_task_list(task)
    goto_command(task)
    #run_playwright()