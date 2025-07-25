import os
import sys

import boto3
import pytest
from moto import mock_aws

# Add the source directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "Src", "store_conn"))

# Import after path setup (flake8: noqa)
from app import lambda_handler  # noqa: E402


@mock_aws
def test_connect_event():
    """Test WebSocket connection event"""
    # Set up mock DynamoDB
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    
    # Create mock table
    table = dynamodb.create_table(
        TableName="VoiceNavConnections",
        KeySchema=[{"AttributeName": "connID", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "connID", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )

    # Set environment variable
    os.environ["CONN_TABLE"] = "VoiceNavConnections"
    
    event = {
        "requestContext": {
            "connectionId": "test-connection-123",
            "eventType": "CONNECT",
        }
    }

    response = lambda_handler(event, None)

    assert response["statusCode"] == 200

    # Verify connection was stored
    items = table.scan()["Items"]
    assert len(items) == 1
    assert items[0]["connID"] == "test-connection-123"
    assert "ttl" in items[0]


@mock_aws
def test_disconnect_event():
    """Test WebSocket disconnection event"""
    # Set up mock DynamoDB
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    
    # Create mock table
    table = dynamodb.create_table(
        TableName="VoiceNavConnections",
        KeySchema=[{"AttributeName": "connID", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "connID", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )

    # Set environment variable
    os.environ["CONN_TABLE"] = "VoiceNavConnections"
    
    # First add a connection
    table.put_item(Item={"connID": "test-connection-456", "ttl": 1234567890})

    event = {
        "requestContext": {
            "connectionId": "test-connection-456",
            "eventType": "DISCONNECT",
        }
    }

    response = lambda_handler(event, None)

    assert response["statusCode"] == 200

    # Verify connection was removed
    items = table.scan()["Items"]
    assert len(items) == 0


@mock_aws
def test_invalid_event():
    """Test handling of invalid events"""
    # Set up mock DynamoDB
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    
    # Create mock table
    table = dynamodb.create_table(
        TableName="VoiceNavConnections",
        KeySchema=[{"AttributeName": "connID", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "connID", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )

    # Set environment variable
    os.environ["CONN_TABLE"] = "VoiceNavConnections"
    
    event = {}

    response = lambda_handler(event, None)

    assert response["statusCode"] == 500
