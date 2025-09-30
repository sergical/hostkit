# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HostKit** is an AI-powered event attendance confirmation system that uses voice calls to automatically confirm attendee participation.

### Tech Stack
- **Frontend**: TanStack Start (React framework) with TanStack Router
- **Backend**: Convex (real-time database and backend-as-a-service)
- **Voice System**: Twilio + Google Gemini Live API (native audio)
- **Audio Server**: Express.js WebSocket server (port 3001)
- **Authentication**: Better Auth integrated with Convex
- **Deployment Target**: Cloudflare Workers
- **Styling**: Tailwind CSS v4 with Radix UI components
- **Monitoring**: Sentry for error tracking

### How It Works

1. **Event Management**: Organizers create events and add attendees (name + phone number) in the dashboard
2. **Call Initiation**: Click "Call" button → Convex action initiates Twilio outbound call with custom parameters (phoneNumber, eventId)
3. **Audio Bridging**: Twilio streams audio via WebSocket to Express server (`twilio-server/server.js`)
4. **Audio Conversion**:
   - Inbound: Twilio μ-law 8kHz → PCM 16kHz for Gemini
   - Outbound: Gemini PCM 24kHz → μ-law 8kHz for Twilio
5. **AI Conversation**: Gemini Live greets attendee by name, asks about attendance confirmation
6. **Tool Calling**: Based on response:
   - YES → calls `confirm_attendee` tool → updates status to "confirmed"
   - NO → calls `remove_attendee` tool → updates status to "cancelled"
7. **Database Update**: Express server calls Convex HTTP endpoints to update attendee status
8. **Real-time UI**: Dashboard shows live status updates via Convex subscriptions

## Commands

### Development
```bash
npm run dev                # Start dev server (web + database)
npm run dev:web           # Start Vite dev server on port 3000
npm run dev:db            # Start Convex dev backend

# Twilio Server (separate terminal)
cd twilio-server
node server.js            # Start audio bridging server on port 3001
```

### Building & Deployment
```bash
npm run build             # Build for production
npm run deploy            # Deploy to Cloudflare Workers
npm run start             # Run production build locally
```

### Code Quality
```bash
npm run check-types       # TypeScript type checking (no emit)
npm run lint              # Run Prettier + ESLint
npm run format            # Format code with Prettier
```

### Convex
```bash
npm run generate          # Generate Convex schema once (npx convex dev --once)
npm run cf-typegen        # Generate Cloudflare Worker types
```

## Architecture

### Frontend Structure

The app uses **TanStack Start** (file-based routing) with routes in `src/routes/`:
- `__root.tsx` - Root layout with auth provider, theme provider, Sentry wrapper
- `_authed.tsx` - Protected route layout (requires authentication)
- `_authed/dashboard.tsx` - Main dashboard (example protected route)
- `sign-in.tsx`, `sign-up.tsx`, `reset-password.tsx` - Auth flows
- `api/auth/$.ts` - Better Auth API catch-all route

**Router setup** (`src/router.tsx`):
- Creates ConvexReactClient with `expectAuth: true`
- Integrates ConvexQueryClient with TanStack Query
- SSR query integration for proper hydration
- Context includes `queryClient` and `convexQueryClient`

### Backend Structure (Convex)

Backend code lives in `convex/`:
- `schema.ts` - Database schema definitions
- `auth.config.ts` - Auth configuration for Convex
- `http.ts` - HTTP endpoints (if needed)
- Function files use Convex's new function syntax with validators

**Key Convex patterns**:
- Always use new function syntax with `args`, `returns`, and `handler`
- Use `query`, `mutation`, `action` for public APIs
- Use `internalQuery`, `internalMutation`, `internalAction` for private functions
- File-based routing: `convex/foo.ts` exports become `api.foo.functionName`
- Always include validators for args and returns (use `v.null()` for void returns)

### Authentication Flow

- **Better Auth** integrated with Convex backend
- Server-side: `fetchSession()` in `__root.tsx` beforeLoad sets auth token for SSR
- Client-side: `ConvexBetterAuthProvider` wraps app, `authClient` handles auth
- Auth helpers in `src/lib/auth-server.ts` (`fetchQuery`, `fetchMutation`, `fetchAction`)

### State Management

- **TanStack Query** + **Convex React Query** for data fetching
- Convex provides real-time subscriptions automatically
- Query client configured with Convex-specific hash and query functions
- SSR-aware with proper hydration

### Styling & UI

- **Tailwind CSS v4** (using `@tailwindcss/postcss`)
- **Radix UI** primitives in `src/components/ui/`
- Theme system with SSR-safe hydration (see `__root.tsx` script tag)
- Theme stored in cookies, loaded server-side via `getThemeServerFn()`
- Path alias: `@/` maps to `src/`

### Deployment

- Targets **Cloudflare Workers** (via `wrangler.toml`)
- Build output: `.output/server/index.mjs` (main), `.output/public` (assets)
- Vite config uses `target: 'cloudflare-module'` in tanstackStart plugin
- Requires Node.js compatibility flag in Cloudflare

## Important Guidelines

### Convex Development
- Follow all guidelines in `.cursor/rules/convex_rules.mdc`
- Always use validators for all function args and returns
- Index names should include all indexed fields: `by_field1_and_field2`
- Use `v.int64()` for 64-bit integers (not `v.bigint()`)
- System fields `_id` and `_creationTime` are automatically added
- Use `Id<"tableName">` type from `./_generated/dataModel` for type safety

### UI Development
- Follow guidelines in `.cursor/rules/web_interface_guidelines.mdc`
- Focus on accessibility (keyboard nav, ARIA, focus management)
- Mobile-first: 44px touch targets, 16px input font-size
- Honor `prefers-reduced-motion`
- Use compositor-friendly animations (`transform`, `opacity`)
- URL should reflect state (filters, tabs, pagination)

### TanStack Router
- Reference `.cursor/rules/tanstack-react-router_*.mdc` for detailed patterns
- Use `createFileRoute` for type-safe route definitions
- Context flows from root through `beforeLoad` functions
- Use `useRouteContext({ from: Route.id })` for type-safe context access

### Cloudflare Workers
- Reference `.cursor/rules/cloudflare-workers.mdc` for Workers-specific patterns
- Node.js built-ins available via compatibility flag
- Respect Cloudflare's limits (CPU time, memory, etc.)

## Path Aliases

- `@/*` → `src/*`
- `@convex/*` → `convex/*`

## Environment Variables

Required in `.env.local`:
- `VITE_CONVEX_URL` - Convex deployment URL
- `VITE_CONVEX_SITE_URL` - Convex site URL for HTTP endpoints (e.g., `https://outstanding-bison-162.convex.site`)
- `CONVEX_SITE_URL` - Site URL for auth callbacks
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number (e.g., `+1234567890`)
- `TWILIO_STREAM_URL` - WebSocket URL for Twilio MediaStreams (e.g., `wss://hostk.it.com/stream`)
- `GEMINI_API_KEY` - Google AI API key for Gemini Live
- `SENTRY_AUTH_TOKEN` - For sourcemap uploads (optional)

## Key Files

### Twilio + Gemini Integration
- `twilio-server/server.js` - Express WebSocket server bridging Twilio and Gemini
  - Audio format conversion (μ-law ↔ PCM)
  - Gemini Live session management
  - Tool call handling (confirm/remove attendee)
- `convex/twilio.ts` - Convex action to initiate outbound calls
- `convex/http.ts` - HTTP endpoints for tool calls (`/confirm-attendee`, `/remove-attendee`)

### Database Schema
- `convex/schema.ts` - Events, attendees, calls tables
- `convex/events.ts` - Mutations/queries for event and attendee management
- `convex/seedEvents.ts` - Seed script to populate test data

### UI Components
- `src/components/CallManager.tsx` - Main dashboard component
  - Event list with attendees
  - Add attendee form
  - Call initiation buttons
  - Reset to pending buttons