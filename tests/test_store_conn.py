import pytest
import json
import os
from unittest.mock import Mock, patch
from moto import mock_dynamodb
import boto3

# Add the source directory to the path
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'Src', 'store-conn'))

from app import lambda_handler


@mock_dynamodb
class TestStoreConnHandler:
    
    def setup_method(self):
        """Set up test environment before each test"""
        self.dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        
        # Create mock table
        self.table = self.dynamodb.create_table(
            TableName='VoiceNavConnections',
            KeySchema=[
                {'AttributeName': 'connID', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'connID', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        
        # Set environment variable
        os.environ['CONN_TABLE'] = 'VoiceNavConnections'
    
    def test_connect_event(self):
        """Test WebSocket connection event"""
        event = {
            "requestContext": {
                "connectionId": "test-connection-123",
                "eventType": "CONNECT"
            }
        }
        
        response = lambda_handler(event, None)
        
        assert response['statusCode'] == 200
        
        # Verify connection was stored
        items = self.table.scan()['Items']
        assert len(items) == 1
        assert items[0]['connID'] == 'test-connection-123'
        assert 'ttl' in items[0]
    
    def test_disconnect_event(self):
        """Test WebSocket disconnection event"""
        # First add a connection
        self.table.put_item(Item={
            'connID': 'test-connection-456',
            'ttl': 1234567890
        })
        
        event = {
            "requestContext": {
                "connectionId": "test-connection-456", 
                "eventType": "DISCONNECT"
            }
        }
        
        response = lambda_handler(event, None)
        
        assert response['statusCode'] == 200
        
        # Verify connection was removed
        items = self.table.scan()['Items']
        assert len(items) == 0
    
    def test_invalid_event(self):
        """Test handling of invalid events"""
        event = {}
        
        response = lambda_handler(event, None)
        
        assert response['statusCode'] == 500
