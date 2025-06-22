import json, os, boto3, logging

# —— basic logging setup ——
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

MODEL_ID = os.getenv("MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")
REGION   = os.getenv("AWS_REGION", "us-east-1")
bedrock  = boto3.client("bedrock-runtime", region_name=REGION)

PROMPT = (
    "You are an accessibility assistant. "
    "Return ONLY valid JSON {{action, selector, value?}} for: \"{cmd}\""
)

def lambda_handler(event, _):
    cmd = event.get("command", "click home")
    log.info("Received command: %s", cmd)

    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "messages": [{"role": "user", "content": PROMPT.format(cmd=cmd)}],
        "max_tokens": 128
    }

    log.info("Invoking Bedrock model %s", MODEL_ID)
    response = bedrock.invoke_model(
        modelId     = MODEL_ID,
        contentType = "application/json",
        accept      = "application/json",
        body        = json.dumps(payload)
    )

    raw_text = response["body"].read().decode()
    log.info("Raw Bedrock response: %s", raw_text)

    intent = json.loads(raw_text)
    log.info("Parsed intent: %s", intent)

    return intent