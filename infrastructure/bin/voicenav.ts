#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VoiceNavStack } from '../lib/voicenav-stack';

const app = new cdk.App();

new VoiceNavStack(app, 'VoiceNavStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  
  // Custom configuration
  bucketName: app.node.tryGetContext('bucketName') || 'voicenav-bucket',
  tableName: app.node.tryGetContext('tableName') || 'VoiceNavConnections',
  bedrockModelId: app.node.tryGetContext('bedrockModelId') || 'anthropic.claude-3-sonnet-20240229-v1:0',
  
  // Lambda source paths (updated to use underscores)
  lambdaPaths: {
    storeConn: '../Src/store_conn',
    transcribeProcessor: '../Src/transcribe_processor', 
    bedrockProcessor: '../Src/bedrock_processor'
  }
});
