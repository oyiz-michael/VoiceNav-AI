# store_conn.py
import boto3, os, time
table = boto3.resource("dynamodb").Table(os.getenv("CONN_TABLE"))

def lambda_handler(event, _):
    cid = event["requestContext"]["connectionId"]
    if event["requestContext"]["eventType"] == "CONNECT":
        table.put_item(Item={"connID": cid, "ttl": int(time.time()) + 3600})
    else:                           # DISCONNECT
        table.delete_item(Key={"connId": cid})
    return {"statusCode": 200}