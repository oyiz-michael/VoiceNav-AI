# Changelog

All notable changes to VoiceNav-AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-24

### Added
- Initial release of VoiceNav-AI
- Serverless voice-controlled web accessibility
- AWS Lambda functions for WebSocket management, transcription, and intent processing
- Real-time WebSocket communication
- Amazon Transcribe integration for speech-to-text
- AWS Bedrock (Claude-3 Sonnet) for intent processing
- Browser-based audio recording and upload
- Demo website with voice navigation
- Comprehensive documentation and deployment guides
- CDK infrastructure as code
- Security policies and contributing guidelines
- GitHub Actions CI/CD pipeline
- Integration examples

### Features
- Zero-installation voice control for websites
- Natural language voice commands
- Support for click, navigate, type, scroll, and focus actions
- Real-time WebSocket-based intent delivery
- Automatic audio cleanup and connection management
- Cost-effective serverless architecture (~$0.18/month idle)
- Cross-browser compatibility
- Accessibility-first design

### Technical Details
- Python 3.12 Lambda functions
- Vanilla JavaScript client (no dependencies)
- AWS S3 for temporary audio storage
- DynamoDB for WebSocket connection management
- API Gateway for WebSocket endpoints
- CloudWatch for logging and monitoring

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## Security

See [SECURITY.md](SECURITY.md) for security policies and vulnerability reporting.
