"""
Transcribe Processor for VoiceNav-AI

Triggered by S3 ObjectCreated events from audio uploads.
Starts Amazon Transcribe jobs for voice-to-text conversion.

Flow:
S3:audio-store/* → Lambda → Transcribe → S3:transcribe-output/*
"""

import os
import json
import uuid
import boto3
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize AWS clients
transcribe_client = boto3.client("transcribe")
s3_client = boto3.client("s3")

# Environment variables with defaults
OUTPUT_BUCKET = os.environ.get("OUTPUT_BUCKET", os.environ.get("AWS_BUCKET", "voicenav-bucket"))
OUTPUT_PREFIX = os.environ.get("OUTPUT_PREFIX", "transcribe-output/")
LANGUAGE_CODE = os.environ.get("LANGUAGE_CODE", "en-US")
MEDIA_FORMAT = os.environ.get("MEDIA_FORMAT", "webm")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Process S3 ObjectCreated event to start transcription.
    
    Args:
        event: S3 event from audio file upload
        context: Lambda context (unused)
        
    Returns:
        Dict with statusCode and job details
    """
    try:
        # Extract S3 event details
        record = event["Records"][0]["s3"]
        input_bucket = record["bucket"]["name"]
        input_key = record["object"]["key"]
        
        logger.info(f"Processing audio file: s3://{input_bucket}/{input_key}")
        
        # Generate unique job name
        job_id = f"voicenav-job-{uuid.uuid4()}"
        media_uri = f"s3://{input_bucket}/{input_key}"
        
        # Start transcription job
        response = transcribe_client.start_transcription_job(
            TranscriptionJobName=job_id,
            LanguageCode=LANGUAGE_CODE,
            MediaFormat=MEDIA_FORMAT,
            Media={"MediaFileUri": media_uri},
            OutputBucketName=OUTPUT_BUCKET,
            OutputKey=f"{OUTPUT_PREFIX}{job_id}.json",
            Settings={
                "ShowSpeakerLabels": False,
                "MaxSpeakerLabels": 1,
            }
        )
        
        logger.info(f"Started transcription job: {job_id}")
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "jobId": job_id,
                "mediaUri": media_uri,
                "outputLocation": f"s3://{OUTPUT_BUCKET}/{OUTPUT_PREFIX}{job_id}.json",
                "status": "STARTED"
            })
        }
        
    except Exception as e:
        logger.error(f"Error processing transcription request: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": "Failed to start transcription job",
                "details": str(e)
            })
        }
