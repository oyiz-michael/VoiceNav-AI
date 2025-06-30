# -*- coding: utf-8 -*-
"""
Invoked by S3 → ‘transcribe-output/…json’.
Parses the transcript, asks Bedrock for an intent, pushes that intent
to every live WebSocket connection stored in DynamoDB.
"""
import boto3, json, os, time, urllib.parse, logging, traceback
from datetime import datetime, timezone

# ── 1.  ENV ─────────────────────────────────────────────────────────
REGION       = os.environ["REGION"]            # us-east-1
BUCKET       = os.environ["AWS_BUCKET"]        # voicenav-bucket
PREFIX       = os.environ["OUTPUT_PREFIX"]     # transcribe-output/
MODEL_ID     = os.environ["MODEL_ID"]          # anthropic.claude-3-sonnet-…
CONN_TABLE   = os.environ["CONN_TABLE"]        # VoiceNavConnections
WS_ENDPOINT  = os.environ["WS_ENDPOINT"]       # https://…execute-api…/production

# ── 2.  CLIENTS ─────────────────────────────────────────────────────
s3     = boto3.client("s3", region_name=REGION)
ddb    = boto3.resource("dynamodb", region_name=REGION).Table(CONN_TABLE)
bed    = boto3.client("bedrock-runtime", region_name=REGION)
apigw  = boto3.client("apigatewaymanagementapi",
                      region_name=REGION,
                      endpoint_url=WS_ENDPOINT)

# ── 3.  LOGGING ─────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)-7s %(asctime)sZ %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S"
)
log = logging.getLogger(__name__)

# ── 4.  PROMPT ( **ALL** braces that are NOT .format-place-holders are doubled )
PROMPT = (
    "You are an accessibility assistant.\n"
    "Valid UI selectors:\n"
    "  #nav-home        – Home tab\n"
    "  #nav-book        – Book Appointment tab\n"
    "  #nav-contact     – Contact Support tab\n"
    "Return ONLY JSON like "
    "{{\"action\":\"click\", \"selector\":\"#nav-book\"}}.\n\n"
    "User command: \"{cmd}\""
)

# ── 5.  HELPERS ─────────────────────────────────────────────────────
def ask_bedrock(cmd: str) -> dict:
    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "messages": [{"role": "user", "content": PROMPT.format(cmd=cmd)}],
        "max_tokens": 128,
    }
    rsp  = bed.invoke_model(modelId=MODEL_ID,
                            contentType="application/json",
                            accept="application/json",
                            body=json.dumps(payload))
    txt  = json.loads(rsp["body"].read())["content"][0]["text"]
    return json.loads(txt)          # -> {"action":"click","selector":"#nav-book"}

def broadcast(intent: dict) -> None:
    now  = int(time.time())
    conns = ddb.scan(
        ProjectionExpression="#c,#t",
        ExpressionAttributeNames={"#c":"connID", "#t":"ttl"},
        FilterExpression   ="#t > :now",
        ExpressionAttributeValues={":now": now}
    )["Items"]

    log.info("Live connections → %s", [c["connID"] for c in conns])
    for c in conns:
        cid = c["connID"]
        try:
            apigw.post_to_connection(ConnectionId=cid,
                                     Data=json.dumps(intent).encode())
        except apigw.exceptions.GoneException:
            log.warning("Stale %s – removing", cid)
            ddb.delete_item(Key={"connID": cid})
        except Exception as e:
            log.error("Post to %s failed – %s", cid, e)

# ── 6.  LAMBDA HANDLER ─────────────────────────────────────────────
def lambda_handler(event, _):
    try:
        rec  = event["Records"][0]["s3"]
        key  = urllib.parse.unquote_plus(rec["object"]["key"])
        if not (key.startswith(PREFIX) and key.endswith(".json")):
            log.info("Skip %s", key); return {"statusCode":204}

        body = s3.get_object(Bucket=rec["bucket"]["name"], Key=key)["Body"].read()
        text = json.loads(body)["results"]["transcripts"][0]["transcript"]
        log.info("Transcript = «%s»", text)

        intent = ask_bedrock(text)
        log.info("Intent     = %s", intent)

        if {"action","selector"} <= intent.keys():
            broadcast(intent)
        else:
            log.error("⚠ Bad intent: %s", intent)
        return {"statusCode":200}

    except Exception as exc:
        log.error("FATAL %s\n%s", exc, traceback.format_exc())
        raise
    