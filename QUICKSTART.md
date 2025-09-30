# Co-host Kit - Quick Start Guide

Get the full inbound event bot running in 15 minutes.

## What You'll Build

An AI phone agent that:
- ✅ Calls attendees to confirm attendance
- ✅ Answers questions about your event via phone
- ✅ Uses RAG to provide accurate event information
- ✅ Logs all conversations with transcripts

## Prerequisites

- Node.js 18+
- Google Cloud account with billing
- ~15 minutes

## 5-Step Setup

### 1. Install & Start App (2 min)

```bash
# Clone and install
git clone <your-repo>
cd hostkit
npm install

# Install voice agent
npm run voice:install

# Start Convex
npm run generate
```

### 2. Google Cloud Setup (5 min)

```bash
# Install gcloud CLI if needed: https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable Vertex AI
gcloud services enable aiplatform.googleapis.com

# Create service account with permissions
gcloud iam service-accounts create voice-agent
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:voice-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Generate key
gcloud iam service-accounts keys create voice-agent/service-account.json \
  --iam-account=voice-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 3. Configure Voice Agent (2 min)

```bash
# Copy and edit config
cp voice-agent/.env.example voice-agent/.env
```

Edit `voice-agent/.env`:
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOY_KEY=prod:abc123...  # from: npx convex deploy-key generate
```

### 4. Expose with ngrok (3 min)

```bash
# Install ngrok: https://ngrok.com/download

# Terminal 1: Start everything
npm run dev

# Terminal 2: Expose voice agent
ngrok http 8080

# Copy the https URL (e.g., https://abc123.ngrok.io)
```

### 5. Configure Twilio (3 min)

1. **Get phone number**: [Twilio Console](https://console.twilio.com/) → Buy a Number
2. **Set webhooks**: Configure → Voice & Fax:
   - **A Call Comes In**: `https://YOUR_CONVEX_URL/twilio/voice/inbound`
   - **Status Callback**: `https://YOUR_CONVEX_URL/twilio/call-status`

3. **Update Convex env**: Add `VOICE_AGENT_URL=ws://localhost:8080/media-stream`
   - For ngrok: use `wss://YOUR_NGROK_URL/media-stream`

## Test It!

### Create Your First Event

1. Go to `http://localhost:3000/events`
2. Click "Create Event"
3. Fill in event details
4. Upload content (try a text file with event info)

### Test Inbound (AI Answers Questions)

```bash
# Call your Twilio number
# Ask: "What is this event about?"
# AI will search your content and respond!
```

### Test Outbound (AI Confirms Attendance)

1. Add yourself as attendee (use your real number)
2. Click "Call" button
3. Answer and say "Yes, I'm attending"
4. Check Call Logs tab for transcript

## What's Next?

### Production Deployment

See [VOICE_AGENT_SETUP.md](VOICE_AGENT_SETUP.md) for:
- Deploy to Google Cloud Run
- Production environment setup
- Security best practices

### Add Features

- **Better Content**: Upload PDFs/PowerPoints
- **Multiple Events**: Create different phone numbers per event
- **Analytics**: Track confirmation rates
- **Custom Voices**: Change AI voice in `gemini-client.js`

## Troubleshooting

### "Failed to connect to Gemini"
```bash
# Verify service account has permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:voice-agent*"
```

### "Convex function not found"
```bash
# Make sure Convex is deployed
npx convex dev
# Wait for "Convex functions ready"
```

### "No audio on call"
- Check ngrok is running: `curl https://YOUR_NGROK_URL/health`
- Verify `VOICE_AGENT_URL` in Convex environment
- Check voice agent terminal for errors

### "Call doesn't connect"
1. Check Twilio webhook URLs in console
2. Verify ngrok HTTPS URL is correct
3. Check voice agent logs for WebSocket errors

## Architecture

```
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌────────┐
│ Twilio  │───▶│  Voice  │───▶│  Gemini  │◀──▶│ Convex │
│ Phone   │◀───│  Agent  │◀───│   Live   │    │   DB   │
└─────────┘    └─────────┘    └──────────┘    └────────┘
```

## Files You Created

- ✅ **13 Convex functions** (events, attendees, calls, content, twilio)
- ✅ **Voice agent service** (6 files, ~600 lines)
- ✅ **3 Frontend routes** (events list, event detail, inbound-bot)
- ✅ **3 UI components** (AttendeeTable, CallLogTable, ContentUpload)

## Cost Estimate

**Development**: ~$0 (Free tiers)
**Production** (100 calls, 5 min avg):
- Gemini Live: ~$150
- Twilio Voice: ~$5
- Cloud Run: ~$0 (free tier)

**Total**: ~$155 for 500 minutes of AI calls

## Resources

- [Full Setup Guide](VOICE_AGENT_SETUP.md)
- [Voice Agent README](voice-agent/README.md)
- [Gemini Live API Docs](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/live-api)
- [Twilio Media Streams](https://www.twilio.com/docs/voice/twiml/stream)

## Get Help

Issues? Check:
1. Voice agent logs (Terminal 1)
2. Convex logs (`npx convex logs`)
3. Twilio debugger console
4. [Full troubleshooting guide](VOICE_AGENT_SETUP.md#troubleshooting)

---

**You're ready!** 🎉 Start taking AI-powered calls for your events.
