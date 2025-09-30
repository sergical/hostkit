# Gemini Voice Chat

Real-time voice conversations with Gemini Live API using browser audio.

## Features

- ✅ Real-time voice conversation with Gemini
- ✅ Live audio visualization (waveform)
- ✅ Real-time transcription (user + Gemini)
- ✅ Customizable system prompts
- ✅ Call/Hang up controls
- ✅ Native audio with natural speech
- ✅ Barge-in support (interrupt Gemini anytime)

## Architecture

```
Browser (Web Audio API)
    ↓ WebSocket (PCM audio)
Gemini WS Server (port 8081)
    ↓ @google/genai SDK
Gemini Live API
```

## Setup

### 1. Environment Variables

Make sure you have `GEMINI_API_KEY` in your `.env` file:

```bash
GEMINI_API_KEY=your_api_key_here
```

### 2. Start Development Servers

```bash
npm run dev
```

This starts:
- Web app (port 3001)
- Convex database
- Gemini WebSocket server (port 8081)

## Usage

1. Navigate to **"Talk to Gemini"** in the sidebar
2. (Optional) Customize the system prompt
3. Click **"Start Call"** to begin
4. Grant microphone permissions when prompted
5. Start talking! Gemini will respond with voice
6. View live transcription in the right panel
7. Click **"Hang Up"** to end the conversation

## How It Works

### Browser Audio Processing

- Uses Web Audio API to capture microphone input
- Converts audio to PCM 16-bit, 16kHz, mono (Gemini's format)
- Streams audio chunks via WebSocket as base64
- Plays received audio from Gemini through speakers
- Visualizes audio with Canvas-based waveform

### WebSocket Server

- Runs on port 8081 (`voice-agent/gemini-ws-server.js`)
- Bridges browser ↔ Gemini Live API
- Handles session management
- Forwards audio bidirectionally
- Streams transcriptions back to client

### Gemini Live API

- Model: `gemini-2.5-flash-native-audio-preview-09-2025`
- Native audio for natural speech
- Supports interruptions (barge-in)
- Real-time transcription
- Configurable voice (default: "Puck")

## Files Created

### Frontend
- `src/routes/_authed/gemini-chat.tsx` - Main voice chat page
- `src/components/VoiceVisualizer.tsx` - Audio waveform visualization
- `src/components/TranscriptionPanel.tsx` - Live transcript display
- `src/lib/audio-processor.ts` - Browser audio utilities

### Backend
- `voice-agent/gemini-ws-server.js` - WebSocket server for Gemini

### Updated
- `src/components/app-sidebar.tsx` - Added "Talk to Gemini" nav item
- `package.json` - Added `dev:gemini` script

## Technical Details

### Audio Format

**Input (Browser → Gemini):**
- Format: Linear PCM, 16-bit, mono
- Sample Rate: 16kHz
- Encoding: Base64

**Output (Gemini → Browser):**
- Format: Linear PCM, 16-bit, mono
- Sample Rate: 24kHz
- Encoding: Base64

### System Prompt

The system prompt is set **before** connecting and applies to the entire session. It cannot be changed mid-conversation.

Example prompts:
- "You are a helpful AI assistant. Have a natural, friendly conversation."
- "You are a technical support agent. Help users troubleshoot issues."
- "You are a language tutor. Help the user practice speaking Spanish."

### Voice Activity Detection

Gemini automatically detects when the user starts/stops speaking (VAD). You can interrupt Gemini at any time by simply speaking.

## Troubleshooting

### "Failed to initialize" error

- Check that your browser supports Web Audio API
- Grant microphone permissions when prompted
- Try refreshing the page

### "Failed to connect to Gemini" error

- Verify `GEMINI_API_KEY` is set in `.env`
- Check that the Gemini WS server is running on port 8081
- Check console for detailed error messages

### No audio playback

- Check browser audio permissions
- Verify your speakers/headphones are working
- Check browser console for playback errors

### Port 8081 already in use

Change the port in `.env`:
```bash
GEMINI_WS_PORT=8082
```

Then update the WebSocket URL in `src/routes/_authed/gemini-chat.tsx`.

## Limitations

- Maximum session duration: 10 minutes (Gemini API limit)
- Requires stable internet connection
- Browser must support Web Audio API
- Server-to-server only (client uses WebSocket proxy)

## Future Enhancements

- [ ] Session resumption
- [ ] Function calling / tool use
- [ ] Multiple voice options
- [ ] Video input support
- [ ] Session history/playback
- [ ] Ephemeral tokens for production

## Resources

- [Gemini Live API Docs](https://ai.google.dev/gemini-api/docs/live-api)
- [@google/genai SDK](https://github.com/googleapis/js-genai)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
