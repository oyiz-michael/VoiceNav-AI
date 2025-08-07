"""
WebSocket Connection Handler for VoiceNav-AI

Manages WebSocket connections for real-time communication between
the browser client and AWS Lambda backend.

Handles:
- Connection establishment ($connect)
- Connection cleanup ($disconnect)
- Connection TTL management in DynamoDB
"""

import boto3
import os
import time
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_dynamodb_table():
    """Get DynamoDB table instance."""
    region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
    dynamodb = boto3.resource("dynamodb", region_name=region)
    return dynamodb.Table(os.getenv("CONN_TABLE", "VoiceNavConnections"))


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle WebSocket connection events.

    Args:
        event: API Gateway WebSocket event
        context: Lambda context (unused)

    Returns:
        Dict with statusCode for API Gateway
    """
    try:
        connection_id = event["requestContext"]["connectionId"]
        event_type = event["requestContext"]["eventType"]

        logger.info(f"Processing {event_type} for connection {connection_id}")

        # Get table instance
        table = get_dynamodb_table()

        if event_type == "CONNECT":
            # Store connection with 1-hour TTL
            table.put_item(
                Item={
                    "connID": connection_id,
                    "ttl": int(time.time()) + 3600,  # 1 hour from now
                    "connected_at": int(time.time()),
                }
            )
            logger.info(f"Stored connection: {connection_id}")

        elif event_type == "DISCONNECT":
            # Clean up connection
            table.delete_item(Key={"connID": connection_id})
            logger.info(f"Removed connection: {connection_id}")

        return {"statusCode": 200}

    except Exception as e:
        logger.error(f"Error handling connection event: {str(e)}")
        return {"statusCode": 500}
