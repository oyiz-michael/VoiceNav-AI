
VoiceNav‑AI is a serverless accessibility tool that lets visually‑impaired users navigate modern websites by voice.  An AWS‑Lambda backend converts speech to structured intents (using Amazon Transcribe + AWS Bedrock).

# VoiceNav – Accessible, hands-free navigation for any website

> Submission for the **AWS Lambda Hackathon 2025**  
> Team: Uncommon Grounds Network

---

## ✨ Problem & Impact
Millions of users with motor-skill impairments struggle to browse the web.  
BrightSmile VoiceNav lets anyone control a single-page application with **natural voice commands**, no extra software, and no browser extensions. It:

* records a short audio clip in the browser  
* transcribes it with Amazon Transcribe  
* reasons over the text using **Amazon Bedrock (Claude-3 Sonnet)**  
* delivers a JSON “intent” to the site in real-time via API Gateway WebSocket + AWS Lambda  
* triggers on-page actions (click / navigate / type) – completely hands-free.

## 🛠 AWS Architecture

flowchart LR

    A[Browser\nMediaRecorder] --PUT--> S3[(S3 audio-store/)]
    S3 --createObject event--> T[Lambda ✨ Transcribe Trigger]
    T --> TR[AWS Transcribe job]
    TR -->|JSON file| S3out[(S3 transcribe-output/)]
    S3out --ObjectCreated--> B(Bedrock Lambda)
    B --Invoke→ Claude-3 Sonnet\nreturns {"action":...}--> B
    B --Dynamo scan--> D[(DynamoDB VoiceNavConnections)]
    B --PostToConnection--> WS(API Gateway WS)
    WS --websocket--> A
=======
VoiceNav‑AI is a serverless accessibility tool that lets visually‑impaired users navigate modern websites by voice.  An AWS‑Lambda backend converts speech to structured intents (using Amazon Transcribe + a Gen‑AI model) and returns click instructions to the client, which then moves the cursor and reads key page content aloud. 

Tech stacks:
    Lambda
    s3
    dynamoDB
    API Gateway
