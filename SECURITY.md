# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability in VoiceNav-AI, please follow these steps:

### 1. Do NOT Create a Public Issue

Please do not create a public GitHub issue for security vulnerabilities.

### 2. Contact Us Privately

Send details to: [security@voicenav-ai.com](mailto:security@voicenav-ai.com)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fixes (if any)

### 3. Allow Time for Resolution

- We will acknowledge receipt within 48 hours
- We aim to provide a fix within 30 days
- We will coordinate disclosure timing with you

## Security Considerations

### Data Privacy

- **No Audio Storage**: Audio files are automatically deleted after processing
- **Minimal Data**: Only connection IDs and timestamps stored
- **TTL Cleanup**: DynamoDB entries auto-expire after 1 hour
- **No User Data**: No personal information collected or stored

### Network Security

- **HTTPS/WSS Only**: All communication encrypted in transit
- **CORS Protection**: API Gateway configured with appropriate CORS headers
- **Origin Validation**: WebSocket connections validate origin headers

### AWS Security

- **IAM Least Privilege**: Lambda functions have minimal required permissions
- **VPC Isolation**: Can be deployed within VPC for additional security
- **CloudTrail Logging**: All API calls logged for audit
- **Resource-Based Policies**: S3 bucket policies restrict access

### Input Validation

- **Sanitized Selectors**: All CSS selectors validated before execution
- **Intent Validation**: Bedrock responses validated against schema
- **Rate Limiting**: API Gateway provides built-in rate limiting

### Recommended Security Practices

#### For Deployment

1. **Use Unique Bucket Names**: Avoid predictable S3 bucket names
2. **Enable CloudTrail**: Log all API access for audit
3. **Monitor Costs**: Set up billing alerts to detect abuse
4. **Regular Updates**: Keep dependencies updated

#### For Integration

1. **Whitelist Selectors**: Only allow specific CSS selectors
2. **Content Security Policy**: Implement CSP headers
3. **Origin Restrictions**: Limit WebSocket origins
4. **User Consent**: Obtain explicit consent for microphone access

## Known Security Limitations

### Current Limitations

1. **Public S3 Upload**: Audio files use pre-signed URLs for upload
2. **Open WebSocket**: Connections not authenticated by default
3. **Bedrock Costs**: No built-in protection against cost attacks

### Mitigation Strategies

1. **S3 Lifecycle Policies**: Auto-delete files after processing
2. **Connection Limits**: Implement connection rate limiting
3. **Cost Monitoring**: Set up CloudWatch billing alarms

## Security Updates

Security updates will be released as patch versions and announced:

- GitHub Security Advisories
- Release notes marked as "Security"
- Email notifications to security contact list

## Compliance

VoiceNav-AI is designed to support compliance with:

- **GDPR**: No personal data storage, user consent required
- **CCPA**: No personal data sale or retention
- **Section 508**: Accessibility-focused design
- **WCAG 2.1**: Web accessibility guidelines compliance

## Audit Trail

All security-relevant events are logged:

- CloudTrail: AWS API calls
- CloudWatch: Lambda function executions
- API Gateway: Request/response logs
- S3: Access and upload logs

## Third-Party Dependencies

Regular security scanning of dependencies:

- **Dependabot**: Automated dependency updates
- **npm audit**: JavaScript package vulnerability scanning
- **Safety**: Python package vulnerability scanning

## Contact

For security questions or concerns:
- Email: [security@voicenav-ai.com](mailto:security@voicenav-ai.com)
- GPG Key: Available on request
