"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceNavStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const s3Notifications = require("aws-cdk-lib/aws-s3-notifications");
const iam = require("aws-cdk-lib/aws-iam");
class VoiceNavStack extends cdk.Stack {
    constructor(scope, id, props) {
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
                    allowedOrigins: ['*'],
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
        transcribeFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['transcribe:StartTranscriptionJob'],
            resources: ['*'],
        }));
        // Grant Bedrock permissions
        bedrockFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['bedrock:InvokeModel'],
            resources: [`arn:aws:bedrock:${this.region}::foundation-model/${props.bedrockModelId}`],
        }));
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
        storeConnFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['execute-api:ManageConnections'],
            resources: [
                `arn:aws:execute-api:${this.region}:${this.account}:${api.restApiId}/*`,
            ],
        }));
        // Update Bedrock function environment with API endpoint
        bedrockFunction.addEnvironment('API_ENDPOINT', api.url);
        // S3 event notifications
        bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3Notifications.LambdaDestination(transcribeFunction), { prefix: 'audio-store/' });
        bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3Notifications.LambdaDestination(bedrockFunction), { prefix: 'transcribe-output/' });
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
exports.VoiceNavStack = VoiceNavStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VuYXYtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2b2ljZW5hdi1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMseUNBQXlDO0FBQ3pDLHFEQUFxRDtBQUNyRCxpREFBaUQ7QUFDakQseURBQXlEO0FBQ3pELG9FQUFvRTtBQUNwRSwyQ0FBMkM7QUFjM0MsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qix1REFBdUQ7UUFDdkQsTUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNuRCxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVU7WUFDNUIsSUFBSSxFQUFFO2dCQUNKO29CQUNFLGNBQWMsRUFBRTt3QkFDZCxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUc7d0JBQ2xCLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRzt3QkFDbEIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJO3dCQUNuQixFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU07cUJBQ3RCO29CQUNELGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztvQkFDckIsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO2lCQUN0QjthQUNGO1lBQ0QsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLGtCQUFrQjtTQUM3RCxDQUFDLENBQUM7UUFFSCwyQ0FBMkM7UUFDM0MsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ3BFLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztZQUMxQixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUs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R0FBRyxDQUFDLFNBQVMsSUFBSTthQUN4RTtTQUNGLENBQUMsQ0FDSCxDQUFDO1FBRUYsd0RBQXdEO1FBQ3hELGVBQWUsQ0FBQyxjQUFjLENBQzVCLGNBQWMsRUFDZCxHQUFHLENBQUMsR0FBRyxDQUNSLENBQUM7UUFFRix5QkFBeUI7UUFDekIsTUFBTSxDQUFDLG9CQUFvQixDQUN6QixFQUFFLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFDM0IsSUFBSSxlQUFlLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsRUFDekQsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLENBQzNCLENBQUM7UUFFRixNQUFNLENBQUMsb0JBQW9CLENBQ3pCLEVBQUUsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUMzQixJQUFJLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsRUFDdEQsRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsQ0FDakMsQ0FBQztRQUVGLFVBQVU7UUFDVixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsTUFBTSxDQUFDLFVBQVU7WUFDeEIsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNoQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUc7WUFDZCxXQUFXLEVBQUUsbUJBQW1CO1NBQ2pDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ25DLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTO1lBQ2pDLFdBQVcsRUFBRSxnQ0FBZ0M7U0FDOUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBL0pELHNDQStKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgczNOb3RpZmljYXRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1ub3RpZmljYXRpb25zJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFZvaWNlTmF2U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgYnVja2V0TmFtZTogc3RyaW5nO1xuICB0YWJsZU5hbWU6IHN0cmluZztcbiAgYmVkcm9ja01vZGVsSWQ6IHN0cmluZztcbiAgbGFtYmRhUGF0aHM6IHtcbiAgICBzdG9yZUNvbm46IHN0cmluZztcbiAgICB0cmFuc2NyaWJlUHJvY2Vzc29yOiBzdHJpbmc7XG4gICAgYmVkcm9ja1Byb2Nlc3Nvcjogc3RyaW5nO1xuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgVm9pY2VOYXZTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBWb2ljZU5hdlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIFMzIEJ1Y2tldCBmb3IgYXVkaW8gc3RvcmFnZSBhbmQgdHJhbnNjcmlwdGlvbiBvdXRwdXRcbiAgICBjb25zdCBidWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdWb2ljZU5hdkJ1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IHByb3BzLmJ1Y2tldE5hbWUsXG4gICAgICBjb3JzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW1xuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuR0VULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUFVULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUE9TVCxcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkRFTEVURSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSwgLy8gQ29uZmlndXJlIGFwcHJvcHJpYXRlbHkgZm9yIHByb2R1Y3Rpb25cbiAgICAgICAgICBhbGxvd2VkSGVhZGVyczogWycqJ10sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XG4gICAgfSk7XG5cbiAgICAvLyBEeW5hbW9EQiBUYWJsZSBmb3IgV2ViU29ja2V0IGNvbm5lY3Rpb25zXG4gICAgY29uc3QgY29ubmVjdGlvbnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnQ29ubmVjdGlvbnNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogcHJvcHMudGFibGVOYW1lLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdjb25uSUQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ3R0bCcsXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIFdlYlNvY2tldCBjb25uZWN0aW9uIG1hbmFnZW1lbnRcbiAgICBjb25zdCBzdG9yZUNvbm5GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1N0b3JlQ29ubkZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfOSxcbiAgICAgIGhhbmRsZXI6ICdhcHAubGFtYmRhX2hhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHByb3BzLmxhbWJkYVBhdGhzLnN0b3JlQ29ubiksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBDT05OX1RBQkxFOiBjb25uZWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIHRyYW5zY3JpcHRpb24gcHJvY2Vzc2luZ1xuICAgIGNvbnN0IHRyYW5zY3JpYmVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1RyYW5zY3JpYmVGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzksXG4gICAgICBoYW5kbGVyOiAnYXBwLmxhbWJkYV9oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwcm9wcy5sYW1iZGFQYXRocy50cmFuc2NyaWJlUHJvY2Vzc29yKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIE9VVFBVVF9CVUNLRVQ6IGJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICBPVVRQVVRfUFJFRklYOiAndHJhbnNjcmliZS1vdXRwdXQvJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIEJlZHJvY2sgcHJvY2Vzc2luZ1xuICAgIGNvbnN0IGJlZHJvY2tGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0JlZHJvY2tGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzksXG4gICAgICBoYW5kbGVyOiAnYXBwLmxhbWJkYV9oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwcm9wcy5sYW1iZGFQYXRocy5iZWRyb2NrUHJvY2Vzc29yKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFJFR0lPTjogdGhpcy5yZWdpb24sXG4gICAgICAgIEFXU19CVUNLRVQ6IGJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICBPVVRQVVRfUFJFRklYOiAndHJhbnNjcmliZS1vdXRwdXQvJyxcbiAgICAgICAgTU9ERUxfSUQ6IHByb3BzLmJlZHJvY2tNb2RlbElkLFxuICAgICAgICBDT05OX1RBQkxFOiBjb25uZWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgV1NfRU5EUE9JTlQ6ICcnLCAvLyBXaWxsIGJlIHNldCBhZnRlciBXZWJTb2NrZXQgQVBJIGlzIGNyZWF0ZWRcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBwZXJtaXNzaW9uc1xuICAgIGNvbm5lY3Rpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHN0b3JlQ29ubkZ1bmN0aW9uKTtcbiAgICBjb25uZWN0aW9uc1RhYmxlLmdyYW50UmVhZERhdGEoYmVkcm9ja0Z1bmN0aW9uKTtcbiAgICBcbiAgICBidWNrZXQuZ3JhbnRSZWFkV3JpdGUodHJhbnNjcmliZUZ1bmN0aW9uKTtcbiAgICBidWNrZXQuZ3JhbnRSZWFkKGJlZHJvY2tGdW5jdGlvbik7XG5cbiAgICAvLyBHcmFudCBUcmFuc2NyaWJlIHBlcm1pc3Npb25zXG4gICAgdHJhbnNjcmliZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbJ3RyYW5zY3JpYmU6U3RhcnRUcmFuc2NyaXB0aW9uSm9iJ10sXG4gICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBHcmFudCBCZWRyb2NrIHBlcm1pc3Npb25zXG4gICAgYmVkcm9ja0Z1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbJ2JlZHJvY2s6SW52b2tlTW9kZWwnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6YmVkcm9jazoke3RoaXMucmVnaW9ufTo6Zm91bmRhdGlvbi1tb2RlbC8ke3Byb3BzLmJlZHJvY2tNb2RlbElkfWBdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gUkVTVCBBUEkgR2F0ZXdheVxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ1ZvaWNlTmF2QXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdWb2ljZU5hdiBTZXJ2aWNlJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGZvciBWb2ljZU5hdiBhcHBsaWNhdGlvbicsXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ1gtQW16LURhdGUnLCAnQXV0aG9yaXphdGlvbicsICdYLUFwaS1LZXknXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBUEkgUmVzb3VyY2VzXG4gICAgY29uc3QgY29ubmVjdFJlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2Nvbm5lY3QnKTtcbiAgICBjb25zdCBkaXNjb25uZWN0UmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnZGlzY29ubmVjdCcpO1xuXG4gICAgLy8gSW50ZWdyYXRpb25zXG4gICAgY29uc3Qgc3RvcmVDb25uSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihzdG9yZUNvbm5GdW5jdGlvbik7XG4gICAgXG4gICAgY29ubmVjdFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIHN0b3JlQ29ubkludGVncmF0aW9uKTtcbiAgICBkaXNjb25uZWN0UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgc3RvcmVDb25uSW50ZWdyYXRpb24pO1xuXG4gICAgLy8gR3JhbnQgQVBJIEdhdGV3YXkgcGVybWlzc2lvbnMgdG8gTGFtYmRhIGZ1bmN0aW9uc1xuICAgIHN0b3JlQ29ubkZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbJ2V4ZWN1dGUtYXBpOk1hbmFnZUNvbm5lY3Rpb25zJ10sXG4gICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgIGBhcm46YXdzOmV4ZWN1dGUtYXBpOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fToke2FwaS5yZXN0QXBpSWR9LypgLFxuICAgICAgICBdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gVXBkYXRlIEJlZHJvY2sgZnVuY3Rpb24gZW52aXJvbm1lbnQgd2l0aCBBUEkgZW5kcG9pbnRcbiAgICBiZWRyb2NrRnVuY3Rpb24uYWRkRW52aXJvbm1lbnQoXG4gICAgICAnQVBJX0VORFBPSU5UJyxcbiAgICAgIGFwaS51cmxcbiAgICApO1xuXG4gICAgLy8gUzMgZXZlbnQgbm90aWZpY2F0aW9uc1xuICAgIGJ1Y2tldC5hZGRFdmVudE5vdGlmaWNhdGlvbihcbiAgICAgIHMzLkV2ZW50VHlwZS5PQkpFQ1RfQ1JFQVRFRCxcbiAgICAgIG5ldyBzM05vdGlmaWNhdGlvbnMuTGFtYmRhRGVzdGluYXRpb24odHJhbnNjcmliZUZ1bmN0aW9uKSxcbiAgICAgIHsgcHJlZml4OiAnYXVkaW8tc3RvcmUvJyB9XG4gICAgKTtcblxuICAgIGJ1Y2tldC5hZGRFdmVudE5vdGlmaWNhdGlvbihcbiAgICAgIHMzLkV2ZW50VHlwZS5PQkpFQ1RfQ1JFQVRFRCxcbiAgICAgIG5ldyBzM05vdGlmaWNhdGlvbnMuTGFtYmRhRGVzdGluYXRpb24oYmVkcm9ja0Z1bmN0aW9uKSxcbiAgICAgIHsgcHJlZml4OiAndHJhbnNjcmliZS1vdXRwdXQvJyB9XG4gICAgKTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiBidWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgQnVja2V0IGZvciBhdWRpbyBzdG9yYWdlJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogYXBpLnVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUkVTVCBBUEkgZW5kcG9pbnQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBjb25uZWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgdGFibGUgZm9yIGNvbm5lY3Rpb25zJyxcbiAgICB9KTtcbiAgfVxufVxuIl19