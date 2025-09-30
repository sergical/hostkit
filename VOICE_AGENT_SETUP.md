# Co-host Kit Voice Agent Setup Guide

Complete setup guide for the inbound event bot with Gemini Live API integration.

## Overview

The Co-host Kit voice agent enables AI-powered phone conversations for event management:
- **Outbound calls**: AI confirms attendee attendance
- **Inbound calls**: AI answers questions about the event using RAG

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌─────────┐
│   Twilio    │─────▶│ Voice Agent  │─────▶│   Gemini    │      │ Convex  │
│  (Phone)    │◀─────│  WebSocket   │◀─────│  Live API   │◀────▶│   DB    │
└─────────────┘      └──────────────┘      └─────────────┘      └─────────┘
   μ-law 8kHz         Audio Conversion       PCM 16kHz          Tool Calls
```

## Prerequisites

1. **Node.js 18+**
2. **Google Cloud Account** with billing enabled
3. **Convex Account** (existing deployment)
4. **Twilio Account** (for phone integration)

## Part 1: Google Cloud Setup

### 1.1 Create/Select Project

```bash
# Install gcloud CLI: https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Create new project (or use existing)
gcloud projects create hostkit-voice --name="Hostkit Voice Agent"

# Set as active project
gcloud config set project hostkit-voice
```

### 1.2 Enable Required APIs

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Enable other required services
gcloud services enable compute.googleapis.com
gcloud services enable storage.googleapis.com
```

### 1.3 Create Service Account

```bash
# Create service account
gcloud iam service-accounts create voice-agent \
  --display-name="Voice Agent Service Account" \
  --description="Service account for Gemini Live API access"

# Get project ID
PROJECT_ID=$(gcloud config get-value project)

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:voice-agent@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create ~/voice-agent-key.json \
  --iam-account=voice-agent@$PROJECT_ID.iam.gserviceaccount.com

# Move key to project
mv ~/voice-agent-key.json voice-agent/service-account.json
```

**⚠️ Important**: Never commit `service-account.json` to git! It's already in `.gitignore`.

## Part 2: Voice Agent Configuration

### 2.1 Install Dependencies

```bash
# Install voice agent dependencies
npm run voice:install
```

### 2.2 Configure Environment

```bash
# Copy example env file
cp voice-agent/.env.example voice-agent/.env
```

Edit `voice-agent/.env`:

```bash
# Server
PORT=8080

# Google Cloud (UPDATE THESE)
GOOGLE_CLOUD_PROJECT=hostkit-voice
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Gemini Model (optional)
GEMINI_MODEL_ID=gemini-2.0-flash-live-preview-04-09

# Convex (UPDATE THESE)
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOY_KEY=your-deploy-key-here
```

### 2.3 Get Convex Deploy Key

```bash
# In the root directory
npx convex deploy --cmd ''

# This will output your CONVEX_URL
# To get deploy key, run:
npx convex deploy-key generate --team-slug your-team-slug
```

Add the deploy key to `voice-agent/.env`.

## Part 3: Convex Environment Variable

The Convex backend needs to know where the voice agent is running.

### Development

Add to your Convex environment (`.env.local` or Convex dashboard):

```bash
VOICE_AGENT_URL=ws://localhost:8080/media-stream
```

### Production

Update via Convex dashboard:

```bash
VOICE_AGENT_URL=wss://your-voice-agent-domain.com/media-stream
```

## Part 4: Local Development

### 4.1 Start All Services

```bash
# From root directory - starts web, database, AND voice agent
npm run dev
```

This runs:
- Web app on `http://localhost:3000`
- Convex dev on default port
- Voice agent on `http://localhost:8080`

### 4.2 Expose with ngrok

Twilio needs a public URL to reach your local voice agent.

```bash
# Install ngrok: https://ngrok.com/download

# In a new terminal, expose voice agent
ngrok http 8080

# You'll get a URL like: https://abc123.ngrok.io
```

**Copy the ngrok HTTPS URL** - you'll need it for Twilio.

### 4.3 Test Health Endpoint

```bash
curl http://localhost:8080/health

# Should return: {"status":"ok","service":"voice-agent"}
```

## Part 5: Twilio Configuration

### 5.1 Get Twilio Phone Number

1. Go to [Twilio Console](https://console.twilio.com/)
2. Buy a phone number (Phone Numbers → Buy a Number)
3. Choose one with Voice capabilities

### 5.2 Configure Webhooks

For your Twilio phone number:

**Voice Configuration:**

1. Go to Phone Numbers → Active Numbers → [Your Number]
2. Under "Voice & Fax", set:
   - **Accept Incoming:** Voice Calls
   - **Configure With:** Webhooks
   - **A Call Comes In:**
     - Webhook: `https://YOUR_CONVEX_URL/twilio/voice/inbound`
     - Method: POST
   - **Call Status Changes:**
     - Webhook: `https://YOUR_CONVEX_URL/twilio/call-status`
     - Method: POST

**For Development with ngrok:**

The Convex webhooks will automatically route to your ngrok URL since you set `VOICE_AGENT_URL` environment variable.

## Part 6: Testing

### 6.1 Create Test Event

1. Start all services: `npm run dev`
2. Go to `http://localhost:3000/events`
3. Create a new event
4. Add test content (upload a text file)
5. Add yourself as an attendee with your phone number

### 6.2 Test Inbound Call

1. Call your Twilio phone number
2. You should hear: "Welcome to the event assistance line..."
3. Try asking: "What is this event about?"
4. The AI should use RAG to answer based on your uploaded content

### 6.3 Test Outbound Call

1. Go to event detail page → Attendees tab
2. Click "Call" button next to your name
3. You should receive a call from the AI
4. Confirm or cancel your attendance

### 6.4 Check Call Logs

Go to event detail → Call Logs tab to see:
- Call duration
- AI-generated summary
- Full transcript

## Part 7: Production Deployment

### Option A: Google Cloud Run (Recommended)

```bash
# Create Dockerfile in voice-agent/
cat > voice-agent/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
EOF

# Build and deploy
cd voice-agent
gcloud run deploy voice-agent \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=hostkit-voice,GOOGLE_CLOUD_LOCATION=us-central1,CONVEX_URL=YOUR_CONVEX_URL,CONVEX_DEPLOY_KEY=YOUR_DEPLOY_KEY"

# Get the service URL
gcloud run services describe voice-agent --region us-central1 --format="value(status.url)"
```

Update Convex environment:
```bash
VOICE_AGENT_URL=wss://voice-agent-xxx.run.app/media-stream
```

### Option B: Railway

1. Push code to GitHub
2. Go to [Railway](https://railway.app/)
3. New Project → Deploy from GitHub
4. Select `voice-agent` as root directory
5. Add environment variables
6. Deploy

### Option C: Render

1. Go to [Render](https://render.com/)
2. New → Web Service
3. Connect repository
4. Set root directory: `voice-agent`
5. Build command: `npm install`
6. Start command: `npm start`
7. Add environment variables
8. Deploy

## Troubleshooting

### "Missing required environment variable"

Check `voice-agent/.env` has all variables set:
```bash
cd voice-agent
cat .env
```

### "Failed to connect to Gemini"

1. Verify service account permissions:
```bash
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:voice-agent*"
```

2. Check Vertex AI API is enabled:
```bash
gcloud services list --enabled | grep aiplatform
```

3. Verify service account key path:
```bash
ls -la voice-agent/service-account.json
```

### "Convex function not found"

Ensure Convex is deployed:
```bash
npx convex dev
# Wait for "Convex functions ready"
```

### Audio Quality Issues

- Check ngrok connection: `curl https://YOUR_NGROK_URL/health`
- Monitor voice agent logs for audio conversion errors
- Verify Twilio media format is μ-law

### Call Not Connecting

1. Check Twilio webhook configuration
2. Verify `VOICE_AGENT_URL` in Convex environment
3. Check ngrok is running and not expired
4. Review voice agent logs: errors will show connection issues

## Monitoring

### Development Logs

Voice agent logs show:
- `[Server]` - WebSocket connections
- `[Twilio]` - Media stream events
- `[Gemini]` - AI responses and tool calls
- `[Convex]` - Database operations

### Production Logs

**Cloud Run:**
```bash
gcloud run services logs read voice-agent --region us-central1 --limit 50
```

**Railway/Render:**
Check dashboard logs

## Cost Estimates

- **Gemini Live API**: ~$0.30 per minute of audio
- **Twilio Voice**: ~$0.0085 per minute + number rental ($1-2/month)
- **Cloud Run**: Free tier covers most dev usage
- **Convex**: Free tier includes included usage

**Estimated cost for 100 calls (5 min avg)**: ~$155

## Security Best Practices

1. **Never commit secrets**:
   - `service-account.json`
   - `.env` files
   - API keys

2. **Rotate credentials regularly**:
```bash
# Create new service account key
gcloud iam service-accounts keys create new-key.json \
  --iam-account=voice-agent@$PROJECT_ID.iam.gserviceaccount.com

# Delete old key
gcloud iam service-accounts keys delete OLD_KEY_ID \
  --iam-account=voice-agent@$PROJECT_ID.iam.gserviceaccount.com
```

3. **Use least privilege**: Service account only needs `aiplatform.user` role

4. **Production**: Add authentication to Convex HTTP endpoints

## Next Steps

- [ ] Add authentication to `/api/calls/trigger-outbound` endpoint
- [ ] Implement real PDF/PPT parsing for content upload
- [ ] Add vector embeddings for better RAG performance
- [ ] Set up production monitoring (Sentry, Datadog, etc.)
- [ ] Configure auto-scaling for voice agent
- [ ] Add support for multiple languages

## Support

For issues:
- Voice Agent: Check `voice-agent/README.md`
- Convex: [Convex Discord](https://discord.gg/convex)
- Gemini: [Google Cloud Support](https://cloud.google.com/support)
- Twilio: [Twilio Support](https://support.twilio.com/)
