# Deployment Guide

This guide walks you through deploying VoiceNav-AI to your AWS account.

## Prerequisites

- AWS Account with administrator access
- AWS CLI configured with your credentials
- Node.js 18+ and npm
- Python 3.12+
- Git

## Option 1: Automated Deployment with CDK (Recommended)

### 1. Setup CDK

```bash
npm install -g aws-cdk
git clone https://github.com/oyiz-michael/VoiceNav-AI.git
cd VoiceNav-AI/infrastructure
npm install
```

### 2. Configure Environment

```bash
# Copy and edit configuration
cp cdk.example.json cdk.json
# Edit cdk.json with your preferences
```

### 3. Deploy

```bash
# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy all stacks
cdk deploy --all
```

## Option 2: Manual Deployment

### Step 1: Create S3 Bucket

```bash
aws s3 mb s3://your-voicenav-bucket --region us-east-1
```

### Step 2: Create DynamoDB Table

```bash
aws dynamodb create-table \
  --table-name VoiceNavConnections \
  --attribute-definitions AttributeName=connID,AttributeType=S \
  --key-schema AttributeName=connID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --time-to-live-specification AttributeName=ttl,Enabled=true
```

### Step 3: Create IAM Roles

#### Lambda Execution Role

```bash
aws iam create-role \
  --role-name VoiceNavLambdaRole \
  --assume-role-policy-document file://iam/lambda-trust-policy.json

aws iam attach-role-policy \
  --role-name VoiceNavLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam put-role-policy \
  --role-name VoiceNavLambdaRole \
  --policy-name VoiceNavPolicy \
  --policy-document file://iam/lambda-policy.json
```

### Step 4: Create Lambda Functions

#### Store Connection Handler

```bash
cd Src/store-conn
zip -r store-conn.zip .
aws lambda create-function \
  --function-name VoiceNav-StoreConn \
  --runtime python3.12 \
  --role arn:aws:iam::YOUR-ACCOUNT:role/VoiceNavLambdaRole \
  --handler app.lambda_handler \
  --zip-file fileb://store-conn.zip \
  --environment Variables='{CONN_TABLE=VoiceNavConnections}'
```

#### Transcribe Processor

```bash
cd ../transcribe-processor
zip -r transcribe-processor.zip .
aws lambda create-function \
  --function-name VoiceNav-TranscribeProcessor \
  --runtime python3.12 \
  --role arn:aws:iam::YOUR-ACCOUNT:role/VoiceNavLambdaRole \
  --handler app.lambda_handler \
  --zip-file fileb://transcribe-processor.zip \
  --environment Variables='{AWS_BUCKET=your-voicenav-bucket,OUTPUT_PREFIX=transcribe-output/}'
```

#### Bedrock Processor

```bash
cd ../bedrock-processor
zip -r bedrock-processor.zip .
aws lambda create-function \
  --function-name VoiceNav-BedrockProcessor \
  --runtime python3.12 \
  --role arn:aws:iam::YOUR-ACCOUNT:role/VoiceNavLambdaRole \
  --handler app.lambda_handler \
  --zip-file fileb://bedrock-processor.zip \
  --environment Variables='{REGION=us-east-1,AWS_BUCKET=your-voicenav-bucket,OUTPUT_PREFIX=transcribe-output/,MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0,CONN_TABLE=VoiceNavConnections,WS_ENDPOINT=YOUR_WS_ENDPOINT}'
```

### Step 5: Create API Gateway WebSocket API

```bash
aws apigatewayv2 create-api \
  --name VoiceNavWebSocket \
  --protocol-type WEBSOCKET \
  --route-selection-expression '$request.body.action'
```

### Step 6: Configure S3 Event Notifications

#### Audio Upload Trigger

```bash
aws s3api put-bucket-notification-configuration \
  --bucket your-voicenav-bucket \
  --notification-configuration file://s3-notifications.json
```

### Step 7: Configure Frontend

```bash
cd Client
cp config.example.js config.js
# Edit config.js with your AWS resource ARNs and endpoints
```

## Environment Variables

| Service | Variable | Description | Example |
|---------|----------|-------------|---------|
| All Lambda | `REGION` | AWS Region | `us-east-1` |
| Store Conn | `CONN_TABLE` | DynamoDB table name | `VoiceNavConnections` |
| Transcribe | `AWS_BUCKET` | S3 bucket name | `voicenav-bucket` |
| Transcribe | `OUTPUT_PREFIX` | Output path prefix | `transcribe-output/` |
| Bedrock | `MODEL_ID` | Bedrock model ID | `anthropic.claude-3-sonnet...` |
| Bedrock | `WS_ENDPOINT` | WebSocket management endpoint | `https://abc.execute-api...` |

## Testing Deployment

### 1. Test Lambda Functions

```bash
# Test store connection
aws lambda invoke \
  --function-name VoiceNav-StoreConn \
  --payload file://test-events/connect-event.json \
  response.json

# Test transcribe processor
aws lambda invoke \
  --function-name VoiceNav-TranscribeProcessor \
  --payload file://test-events/s3-event.json \
  response.json
```

### 2. Test End-to-End

1. Open the client application
2. Click "Start Recording"
3. Say "click contact support"
4. Verify the action is executed

## Monitoring

### CloudWatch Logs

- `/aws/lambda/VoiceNav-StoreConn`
- `/aws/lambda/VoiceNav-TranscribeProcessor`  
- `/aws/lambda/VoiceNav-BedrockProcessor`

### CloudWatch Metrics

Monitor:
- Lambda invocations and errors
- API Gateway connection count
- S3 upload volume
- DynamoDB read/write usage
- Transcribe job success rate

## Troubleshooting

### Common Issues

1. **WebSocket connection fails**
   - Check API Gateway deployment
   - Verify CORS settings
   - Check Lambda permissions

2. **Transcribe jobs fail**
   - Verify S3 bucket permissions
   - Check audio file format
   - Review Lambda logs

3. **Bedrock calls fail**
   - Ensure Bedrock access in region
   - Check IAM permissions
   - Verify model ID

### Debug Mode

Enable debug logging by setting environment variable:
```bash
aws lambda update-function-configuration \
  --function-name VoiceNav-BedrockProcessor \
  --environment Variables='{DEBUG=true,...}'
```

## Cleanup

To remove all resources:

```bash
# Using CDK
cdk destroy --all

# Manual cleanup
aws cloudformation delete-stack --stack-name VoiceNavStack
```

## Cost Optimization

- Use S3 lifecycle policies to auto-delete audio files
- Configure DynamoDB auto-scaling
- Set CloudWatch log retention periods
- Monitor and set billing alerts
