# API Reference

## WebSocket API

### Connection Management

The WebSocket API handles real-time communication between the client and server.

**Endpoint**: `wss://your-api-id.execute-api.region.amazonaws.com/stage`

#### Connection Flow

1. **Connect**: Client establishes WebSocket connection
2. **Send Intent**: Server sends structured intent messages
3. **Disconnect**: Client or server closes connection

#### Message Format

All messages are JSON objects:

```json
{
  "action": "click|navigate|type|scroll|focus",
  "selector": "CSS selector or URL",
  "value": "optional value for type action",
  "direction": "up|down (for scroll)",
  "amount": "number (for scroll)"
}
```

### Supported Intents

#### Click Action
```json
{
  "action": "click",
  "selector": "#nav-home"
}
```

#### Navigate Action
```json
{
  "action": "navigate", 
  "url": "https://example.com"
}
```

#### Type Action
```json
{
  "action": "type",
  "selector": "#name-input",
  "value": "John Doe"
}
```

#### Scroll Action
```json
{
  "action": "scroll",
  "direction": "down",
  "amount": 300
}
```

#### Focus Action
```json
{
  "action": "focus",
  "selector": "#search-box"
}
```

## Lambda Functions

### Store Connection Handler

**Function**: `VoiceNav-StoreConn`
**Trigger**: API Gateway WebSocket $connect/$disconnect
**Purpose**: Manage WebSocket connection lifecycle

#### Environment Variables
- `CONN_TABLE`: DynamoDB table name for connections

#### Events
- `$connect`: Store connection ID with TTL
- `$disconnect`: Remove connection ID

### Transcribe Processor

**Function**: `VoiceNav-TranscribeProcessor`  
**Trigger**: S3 ObjectCreated event
**Purpose**: Start Amazon Transcribe jobs

#### Environment Variables
- `AWS_BUCKET`: S3 bucket name
- `OUTPUT_PREFIX`: Output path prefix (default: `transcribe-output/`)
- `LANGUAGE_CODE`: Language for transcription (default: `en-US`)
- `MEDIA_FORMAT`: Audio format (default: `webm`)

### Bedrock Processor

**Function**: `VoiceNav-BedrockProcessor`
**Trigger**: S3 ObjectCreated event (transcription output)
**Purpose**: Process transcripts and generate intents

#### Environment Variables
- `REGION`: AWS region
- `AWS_BUCKET`: S3 bucket name
- `OUTPUT_PREFIX`: Transcription output prefix
- `MODEL_ID`: Bedrock model identifier
- `CONN_TABLE`: DynamoDB connections table
- `WS_ENDPOINT`: WebSocket management endpoint

## Client JavaScript API

### VoiceNav Class

```javascript
const voiceNav = new VoiceNav(config);
```

#### Configuration Options

```javascript
{
  region: "us-east-1",           // AWS region
  bucket: "voicenav-bucket",     // S3 bucket name  
  prefix: "audio-store/",        // Upload prefix
  wsUrl: "wss://...",           // WebSocket URL
  recordingFormat: "audio/webm", // Audio format
  maxRecordingTime: 30000,      // Max recording duration (ms)
  showDebugLog: true,           // Show debug messages
  autoReconnect: true,          // Auto-reconnect WebSocket
  reconnectDelay: 1000          // Reconnect delay (ms)
}
```

#### Methods

##### `startRecording()`
Start voice recording

##### `stopRecording()`  
Stop recording and upload to S3

##### `addCommand(phrase, selector)`
Add voice command mapping

```javascript
voiceNav.addCommand("book appointment", "#book-btn");
```

##### `addCommands(mappings)`
Add multiple command mappings

```javascript
voiceNav.addCommands({
  "book appointment": "#book-btn",
  "contact us": "#contact-link"
});
```

##### `connect()`
Manually connect WebSocket

##### `disconnect()`
Manually disconnect WebSocket

#### Events

```javascript
voiceNav.on('connected', () => console.log('WebSocket connected'));
voiceNav.on('disconnected', () => console.log('WebSocket disconnected'));
voiceNav.on('intent', (intent) => console.log('Intent received:', intent));
voiceNav.on('error', (error) => console.error('Error:', error));
```

## Voice Commands

### Natural Language Processing

VoiceNav-AI uses AWS Bedrock (Claude-3 Sonnet) to process natural language voice commands and convert them to structured intents.

#### Supported Phrases

**Navigation**:
- "Go to home"
- "Navigate to contact page"
- "Click book appointment"

**Form Interaction**:
- "Type John Doe in the name field"
- "Fill in email address"
- "Focus on search box"

**Page Actions**:
- "Scroll down"
- "Scroll up"
- "Click submit button"

#### Custom Commands

You can extend voice commands by:

1. **Training Data**: Add examples to the Bedrock prompt
2. **Selector Mapping**: Map voice phrases to CSS selectors
3. **Action Types**: Define new action types in the client

### Error Handling

#### Client-Side Errors
- **Microphone Access Denied**: Check browser permissions
- **WebSocket Connection Failed**: Verify endpoint and network
- **Recording Failed**: Check audio format support

#### Server-Side Errors
- **Transcription Failed**: Check audio quality and format
- **Bedrock Unavailable**: Verify model access and region
- **Intent Processing Failed**: Check selector validity

#### Debug Mode

Enable debug logging:

```javascript
const voiceNav = new VoiceNav({
  showDebugLog: true,
  // ... other config
});
```

Monitor CloudWatch logs for server-side debugging.
