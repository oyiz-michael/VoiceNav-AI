# VoiceNav-AI CDK Infrastructure

This directory contains AWS CDK code for deploying VoiceNav-AI infrastructure.

## Quick Start

```bash
npm install
npm run build
cdk deploy
```

## Configuration

Edit `cdk.json` to customize deployment:

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/voicenav.ts",
  "context": {
    "bucketName": "your-voicenav-bucket",
    "tableName": "VoiceNavConnections",
    "bedrockModelId": "anthropic.claude-3-sonnet-20240229-v1:0"
  }
}
```

## Resources Created

- S3 Bucket for audio storage
- DynamoDB table for WebSocket connections
- 3 Lambda functions (store-conn, transcribe-processor, bedrock-processor)
- API Gateway WebSocket API
- IAM roles and policies
- S3 event notifications

## Commands

- `npm run build`   compile typescript to js
- `npm run watch`   watch for changes and compile
- `cdk deploy`      deploy this stack to your default AWS account/region
- `cdk diff`        compare deployed stack with current state
- `cdk synth`       emits the synthesized CloudFormation template
