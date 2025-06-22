import json, os, uuid, boto3, logging
from urllib.parse import unquote_plus

log = logging.getLogger()
log.setLevel(logging.INFO)

TRANSCRIBE   = boto3.client("transcribe")

# hard-code for now; later derive from event
INPUT_BUCKET  = "voicenav-bucket"
OUTPUT_BUCKET = "voicenav-bucket"      # same bucket, different prefix
OUTPUT_PREFIX = "transcribe-output/"   # trailing slash required
LANG_CODE     = "en-US"                # adjust as needed
MEDIA_FORMAT  = "mp3"                 # your sample file

def lambda_handler(event, _ctx):
    """
    Event can be either:
    • an S3 trigger   → event['Records'][0]['s3']['bucket']['name'] / ['object']['key']
    • a manual test   → {"bucket":"...","key":"..."}
    """
    if "Records" in event:         # S3 trigger
        rec   = event["Records"][0]
        bucket= rec["s3"]["bucket"]["name"]
        key   = unquote_plus(rec["s3"]["object"]["key"])
    else:                          # manual invoke
        bucket = event["bucket"]
        key    = event["key"]

    media_uri = f"s3://{bucket}/{key}"
    job_name  = f"transcribe-{uuid.uuid4()}"

    log.info("Starting job %s for %s", job_name, media_uri)

    TRANSCRIBE.start_transcription_job(
        TranscriptionJobName = job_name,
        Media                = {"MediaFileUri": media_uri},
        MediaFormat          = MEDIA_FORMAT,
        LanguageCode         = LANG_CODE,
        OutputBucketName     = OUTPUT_BUCKET,
        OutputKey            = f"{OUTPUT_PREFIX}{job_name}.json"
    )

    return {"status": "started", "job": job_name}