import json
import boto3
import uuid
import base64
from datetime import datetime
from botocore.exceptions import ClientError

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('uploadfile')  # Your table name

def lambda_handler(event, context):
    try:
        if 'body' not in event:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing request body'})
            }

        # Decode the base64-encoded binary body
        image_data = event['body']
        is_base64 = event.get('isBase64Encoded', False)
        if is_base64:
            file_bytes = base64.b64decode(image_data)
        else:
            file_bytes = image_data.encode()  # Fallback if not base64

        # Read metadata from headers
        headers = event.get('headers', {})
        metadata = {
            'filename': headers.get('filename', 'unnamed.mp3'),
            'content_type': headers.get('content-type', 'audio/mpeg'),
            'owner_id': headers.get('owner-id', 'unknown')
        }

        # Generate a unique ID and build S3 key
        file_id = str(uuid.uuid4())
        s3_key = f"audio-store/{file_id}-{metadata['filename']}"

        # Upload to S3
        bucket_name = 'voicenav-bucket'
        s3.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=file_bytes,
            ContentType=metadata['content_type']
        )

        # Generate public S3 URL (if bucket is public or signed URLs used)
        s3_link = f"https://{bucket_name}.s3.amazonaws.com/{s3_key}"

        # Log metadata to DynamoDB
        table.put_item(Item={
            'file_id': file_id,
            'filename': metadata['filename'],
            'owner_id': metadata['owner_id'],
            's3_link': s3_link,
            'upload_date': datetime.utcnow().isoformat(),
            'content_type': metadata['content_type']
        })

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Audio uploaded successfully',
                'file_id': file_id,
                's3_link': s3_link
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
