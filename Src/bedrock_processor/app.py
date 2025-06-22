# file: bedrock_only_test.py  (run locally or deploy as Lambda)
import json, os, boto3

MODEL_ID = os.getenv("MODEL_ID", "anthropic.claude-3-sonnet-20240229")
brt      = boto3.client("bedrock-runtime", region_name=os.getenv("AWS_REGION", "us-east-1"))

PROMPT = """
You are an accessibility assistant. 
For the voice command below, return JSON:
{action, selector, value?}

Command: "{cmd}"
"""

def handler(event, _ctx=None):
    cmd   = event.get("command", "click home")
    body  = {"prompt": PROMPT.format(cmd=cmd), "max_tokens": 128}
    resp  = brt.invoke_model(modelId=MODEL_ID, body=json.dumps(body))

    # Bedrock returns plain text; parse to dict
    intent = json.loads(resp["body"].read())
    print("INTENT:", intent)          # CloudWatch log
    return intent