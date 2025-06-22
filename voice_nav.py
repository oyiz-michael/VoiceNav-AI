import json
import boto3
import uuid
import base64
from datetime import datetime
from botocore.exceptions import ClientError

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('uploadfile')  # Replace with your table name

def lambda_handler(event, context):
    try:
        # Parse the multipart/form-data from API Gateway
        if 'body-json' not in event:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing request body'})
            }

        # Decode data    
        image_data = event['body-json']
        try:
            i_data_decode = base64.b64decode(image_data.split(',')[-1] if ',' in image_data else image_data)
            print(i_data_decode)
            print("data loaded...")
        except json.JSONDecodeError:
            print("data not loaded...")

        # Get metadata from headers
        metadata = {
            'filename': event['params']['header'].get('filename', 'unnamed.jpg'),
            'content_type': event['params']['header'].get('content-type', 'image/jpeg'),
            'owner_id': event['params']['header'].get('owner-id')
        }

        # Generate unique file ID and S3 key
        file_id = str(uuid.uuid4())
        s3_key = f"audio-store/{file_id}-{metadata['filename']}"
        
        # Upload to S3
        s3_bucket = 'voicenav-bucket' 
        s3.put_object(
            Bucket=s3_bucket,
            Key=s3_key,
            Body=i_data_decode,
            ContentType=metadata['content_type']
        )
        
        # Construct S3 link
        s3_link = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key}"

        # Prepare DynamoDB item
        item = {
            'file_id': file_id,
            'filename': metadata['filename'],
            'owner_id': metadata['owner_id'],
            's3_link': s3_link,
            'upload_date': datetime.now().isoformat(),
            'content_type': metadata['content_type']
        }

        # Store metadata in DynamoDB
        table.put_item(Item=item)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'File uploaded successfully',
                'file_id': file_id,
                's3_link': s3_link
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }