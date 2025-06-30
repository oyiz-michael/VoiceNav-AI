# lambda_function.py
import os
import json
import uuid
import boto3

TRANSCRIBE = boto3.client("transcribe")
S3         = boto3.client("s3")

OUTPUT_BUCKET = os.environ.get("OUTPUT_BUCKET",  os.environ["AWS_BUCKET"])
OUTPUT_PREFIX = os.environ.get("OUTPUT_PREFIX", "transcribe-output/")
LANGUAGE      = os.environ.get("LANGUAGE_CODE",  "en-US")
FORMAT        = os.environ.get("MEDIA_FORMAT",   "webm")


def lambda_handler(event, _ctx):
    """
    Triggered by S3:ObjectCreated:* on  s3://<bucket>/audio-store/*
    """
    # 1️⃣  Pick the first record (we get one per upload)
    rec       = event["Records"][0]["s3"]
    in_bucket = rec["bucket"]["name"]
    in_key    = rec["object"]["key"]

    # 2️⃣  Build unique Transcribe-job name & media-URI
    job_id   = f"voicejob-{uuid.uuid4()}"
    media_uri = f"s3://{in_bucket}/{in_key}"

    # 3️⃣  Kick off Transcribe
    TRANSCRIBE.start_transcription_job(
        TranscriptionJobName = job_id,
        LanguageCode         = LANGUAGE,
        MediaFormat          = FORMAT,
        Media                = {"MediaFileUri": media_uri},
        OutputBucketName     = OUTPUT_BUCKET,
        OutputKey            = f"{OUTPUT_PREFIX}{job_id}.json"
    )

    # 4️⃣  (Optional) return info for debugging
    return {
        "statusCode": 200,
        "body": json.dumps({
            "job": job_id,
            "media": media_uri,
            "output": f"s3://{OUTPUT_BUCKET}/{OUTPUT_PREFIX}{job_id}.json"
        })
    }