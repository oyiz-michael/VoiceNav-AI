import json
import boto3
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    # Initialize DynamoDB client
    dynamodb = boto3.resource('dynamodb')
    table_name = 'request-id-table'
    table = dynamodb.Table(table_name)
    
    try:
        # Parse the request body from API Gateway
        if 'body' not in event:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'No request body provided'})
            }
            
        # Parse the JSON body
        try:
            request_body = json.loads(event['body'])
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Invalid JSON format'})
            }
        
        # Check if request_id exists in the payload
        if 'request_id' not in request_body:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'request_id is required'})
            }
            
        request_id = request_body['request_id']
        
        # Store the request_id in DynamoDB
        try:
            response = table.put_item(
                Item={
                    'request_id': request_id
                }
            )
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Request ID stored successfully',
                    'request_id': request_id
                })
            }
            
        except ClientError as e:
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'message': 'Error storing request_id in DynamoDB',
                    'error': str(e)
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }
