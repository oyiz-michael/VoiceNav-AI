from playwright.sync_api import sync_playwright
import boto3
import json
import re

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


def run_playwright():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        task_list = get_task_list(task)
        #url = goto_command(task)
        #page.goto(url, timeout=60000)

        for task_item in task_list.split('\n'):
            task_item = task_item.strip()
            if not task_item:
                continue

            print(f'Executing task: {task_item}')
            if 'Go to' in task_item or 'Navigate to' in task_item:
                match = re.search(r'https?://[^\s]+', task_item)
                if match:
                    url = match.group(0)
                    url = url.rstrip('".')
                    page.goto(url, timeout=60000)
                    print(f'Navigated to {url}')


            elif 'Search for' in task_item or 'Find' in task_item or 'Enter' in task_item:
                try:
                    # Extract search term (remove quotes if present)
                    search_term = task_item.split('Search for ')[-1].split(' in ')[0].strip('"\'')

                    # Wait for and fill search field
                    search_field = page.locator('input#global-search-box')
                    search_field.fill(search_term)
                    search_field.press('Enter')

                    page.wait_for_selector('#results', state='visible', timeout=30000)

                    print(f"Successfully searched for: {search_term}")

                except Exception as e:
                    print(f"Search failed: {e}")


            elif 'Click' in task_item or 'Press' in task_item or 'Select' in task_item:
                # Click on the element specified in the task item
                element_selector = task_item.split('Click ')[-1].strip()
                page.click(element_selector)
                print(f'Clicked on element: {element_selector}')
            elif 'Copy the link' in task_item:
                # Extract and print all links on the page
                links = page.query_selector_all('a')
                for link in links:
                    href = link.get_attribute('href')
                    if href:
                        print(f'Found link: {href}')
            elif 'Go back' in task_item:
                # Go back to the previous page
                page.go_back(timeout=60000)
                print('Went back to the previous page')
            else:
                print(f'Unknown task: {task_item}')
                continue

        page_content = page.content()

        print('Finished automation')
        browser.close()

if __name__ == "__main__":
    run_playwright()