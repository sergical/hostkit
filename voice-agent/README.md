# Voice Agent Service

WebSocket bridge connecting Twilio Media Streams with Google Gemini Live API for real-time voice conversations.

## Architecture

```
Twilio Call → Twilio Media Streams (WebSocket) → Voice Agent → Gemini Live API
                                                      ↓
                                                   Convex DB
```

The voice agent:
1. Receives audio from Twilio (μ-law 8kHz)
2. Converts to Gemini format (PCM 16kHz)
3. Streams to Gemini Live API
4. Receives Gemini responses (audio + function calls)
5. Executes function calls via Convex
6. Streams audio responses back to Twilio

## Prerequisites

- Node.js 18+
- Google Cloud project with Vertex AI API enabled
- Service account with Vertex AI permissions
- Convex deployment
- Twilio account (for testing)

## Setup

### 1. Google Cloud Setup

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Create service account
gcloud iam service-accounts create voice-agent \
  --display-name="Voice Agent Service Account"

# Grant Vertex AI permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:voice-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Download service account key
gcloud iam service-accounts keys create service-account.json \
  --iam-account=voice-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 2. Environment Configuration

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values
nano .env
```

Required environment variables:
- `GOOGLE_CLOUD_PROJECT` - Your GCP project ID
- `GOOGLE_CLOUD_LOCATION` - Region (e.g., us-central1)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON
- `CONVEX_URL` - Your Convex deployment URL
- `CONVEX_DEPLOY_KEY` - Convex deploy key (for internal functions)

### 3. Install Dependencies

```bash
npm install
```

## Development

### Run Locally

```bash
npm run dev
```

The server will start on `http://localhost:8080` with WebSocket endpoint at `ws://localhost:8080/media-stream`.

### Expose with ngrok

For Twilio webhooks to reach your local server:

```bash
# Install ngrok: https://ngrok.com/download

# Expose port 8080
ngrok http 8080

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Update Twilio webhook URLs to use this
```

### Test Connection

```bash
# Health check
curl http://localhost:8080/health

# Expected response: {"status":"ok","service":"voice-agent"}
```

## Deployment

### Option 1: Google Cloud Run

```bash
# Build container
docker build -t voice-agent .

# Tag for GCR
docker tag voice-agent gcr.io/YOUR_PROJECT_ID/voice-agent

# Push to registry
docker push gcr.io/YOUR_PROJECT_ID/voice-agent

# Deploy to Cloud Run
gcloud run deploy voice-agent \
  --image gcr.io/YOUR_PROJECT_ID/voice-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,CONVEX_URL=YOUR_CONVEX_URL"
```

### Option 2: Railway / Render / Fly.io

1. Connect GitHub repository
2. Set environment variables
3. Deploy

**Important**: Set `VOICE_AGENT_URL` environment variable in Convex deployment settings to point to your production URL.

## Integration with Convex

The voice agent calls Convex internal functions:

- `internal.twilio.getEventForCall` - Get event details
- `internal.twilio.findAttendeeByPhone` - Find attendee
- `internal.twilio.updateAttendeeStatus` - Update attendance status
- `internal.twilio.lookupEventContent` - Search event content (RAG)
- `internal.twilio.createCallRecord` - Start call logging
- `internal.twilio.updateCallRecord` - Complete call logging

## Function Calling

The agent exposes two functions to Gemini:

### 1. `update_attendee_status`

Called when user confirms/cancels attendance.

```javascript
{
  attendeeId: "string",
  status: "PENDING" | "CONFIRMED" | "CANCELLED"
}
```

### 2. `lookup_event_content`

Called when user asks questions about the event.

```javascript
{
  eventId: "string",
  query: "What time does the event start?"
}
```

## Audio Format Conversion

- **Twilio**: μ-law encoded, 8kHz, 8-bit, mono
- **Gemini**: Linear PCM, 16kHz, 16-bit, mono

The `audio-utils.js` module handles bidirectional conversion and resampling.

## Troubleshooting

### "Missing required environment variable"
- Check `.env` file has all required variables
- Restart server after changing `.env`

### "Failed to connect to Gemini"
- Verify service account has Vertex AI permissions
- Check `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Ensure Vertex AI API is enabled in GCP

### "Convex function not found"
- Ensure Convex deployment is up to date (`npx convex dev`)
- Check internal functions are defined in `convex/twilio.ts`

### Audio quality issues
- Check Twilio Media Stream format matches expected
- Verify audio conversion in `audio-utils.js`
- Monitor console for conversion errors

## Monitoring

Check logs for:
- `[Server]` - WebSocket connection events
- `[Twilio]` - Twilio Media Stream events
- `[Gemini]` - Gemini Live API events
- `[Convex]` - Convex function calls

## Security

- Never commit `.env` or service account JSON to git
- Use least-privilege IAM roles
- Rotate service account keys regularly
- Use authentication for production webhooks

## License

MIT
