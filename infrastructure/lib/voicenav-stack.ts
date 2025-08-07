import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface VoiceNavStackProps extends cdk.StackProps {
  bucketName: string;
  tableName: string;
  bedrockModelId: string;
  lambdaPaths: {
    storeConn: string;
    transcribeProcessor: string;
    bedrockProcessor: string;
  };
}

export class VoiceNavStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: VoiceNavStackProps) {
    super(scope, id, props);

    // S3 Bucket for audio storage and transcription output
    const bucket = new s3.Bucket(this, 'VoiceNavBucket', {
      bucketName: props.bucketName,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ['*'], // Configure appropriately for production
          allowedHeaders: ['*'],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // DynamoDB Table for WebSocket connections
    const connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: props.tableName,
      partitionKey: { name: 'connID', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // Lambda function for WebSocket connection management
    const storeConnFunction = new lambda.Function(this, 'StoreConnFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'app.lambda_handler',
      code: lambda.Code.fromAsset(props.lambdaPaths.storeConn),
      environment: {
        CONN_TABLE: connectionsTable.tableName,
      },
    });

    // Lambda function for transcription processing
    const transcribeFunction = new lambda.Function(this, 'TranscribeFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'app.lambda_handler',
      code: lambda.Code.fromAsset(props.lambdaPaths.transcribeProcessor),
      environment: {
        OUTPUT_BUCKET: bucket.bucketName,
        OUTPUT_PREFIX: 'transcribe-output/',
      },
    });

    // Lambda function for Bedrock processing
    const bedrockFunction = new lambda.Function(this, 'BedrockFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'app.lambda_handler',
      code: lambda.Code.fromAsset(props.lambdaPaths.bedrockProcessor),
      environment: {
        REGION: this.region,
        AWS_BUCKET: bucket.bucketName,
        OUTPUT_PREFIX: 'transcribe-output/',
        MODEL_ID: props.bedrockModelId,
        CONN_TABLE: connectionsTable.tableName,
        WS_ENDPOINT: '', // Will be set after WebSocket API is created
      },
    });

    // Grant permissions
    connectionsTable.grantReadWriteData(storeConnFunction);
    connectionsTable.grantReadData(bedrockFunction);
    
    bucket.grantReadWrite(transcribeFunction);
    bucket.grantRead(bedrockFunction);

    // Grant Transcribe permissions
    transcribeFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['transcribe:StartTranscriptionJob'],
        resources: ['*'],
      })
    );

    // Grant Bedrock permissions
    bedrockFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [`arn:aws:bedrock:${this.region}::foundation-model/${props.bedrockModelId}`],
      })
    );

    // REST API Gateway
    const api = new apigateway.RestApi(this, 'VoiceNavApi', {
      restApiName: 'VoiceNav Service',
      description: 'API for VoiceNav application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // API Resources
    const connectResource = api.root.addResource('connect');
    const disconnectResource = api.root.addResource('disconnect');

    // Integrations
    const storeConnIntegration = new apigateway.LambdaIntegration(storeConnFunction);
    
    connectResource.addMethod('POST', storeConnIntegration);
    disconnectResource.addMethod('POST', storeConnIntegration);

    // Grant API Gateway permissions to Lambda functions
    storeConnFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['execute-api:ManageConnections'],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${api.restApiId}/*`,
        ],
      })
    );

    // Update Bedrock function environment with API endpoint
    bedrockFunction.addEnvironment(
      'API_ENDPOINT',
      api.url
    );

    // S3 event notifications
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(transcribeFunction),
      { prefix: 'audio-store/' }
    );

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(bedrockFunction),
      { prefix: 'transcribe-output/' }
    );

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'S3 Bucket for audio storage',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'REST API endpoint',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: connectionsTable.tableName,
      description: 'DynamoDB table for connections',
    });
  }
}
