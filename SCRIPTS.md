# NPM Scripts Reference

Complete reference for all available npm scripts in the Co-host Kit project.

## Development Scripts

### `npm run dev`
Starts all services concurrently for local development:
- Web app (TanStack Start) on port 3000
- Convex database in dev mode
- Voice agent WebSocket server on port 8080

**Use this for**: Full-stack development with hot reload

```bash
npm run dev
```

### `npm run dev:web`
Starts only the web app dev server on port 3000.

**Use this for**: Frontend-only development

```bash
npm run dev:web
```

### `npm run dev:db`
Starts only the Convex development database.

**Use this for**: Backend/database development

```bash
npm run dev:db
```

### `npm run dev:voice`
Starts only the voice agent WebSocket server on port 8080.

**Use this for**: Voice agent development/testing

```bash
npm run dev:voice
```

## Build Scripts

### `npm run build`
Builds the TanStack Start web application for production.

**Output**: `.output/` directory

```bash
npm run build
```

### `npm run build:all`
Builds the web app and installs voice agent production dependencies.

**Use this for**: Complete production build

```bash
npm run build:all
```

## Production Scripts

### `npm start`
Starts both web and voice agent servers in production mode.

**Requirements**: Must run `npm run build:all` first

```bash
# Build first
npm run build:all

# Start both services
npm start
```

### `npm run start:web`
Starts only the web app production server.

```bash
npm run start:web
```

### `npm run start:voice`
Starts only the voice agent production server.

```bash
npm run start:voice
```

## Voice Agent Scripts

### `npm run voice:install`
Installs voice agent dependencies.

**Run this**: After cloning the repo

```bash
npm run voice:install
```

### `npm run voice:start`
Starts the voice agent server (alias for `start:voice`).

```bash
npm run voice:start
```

## Database Scripts

### `npm run generate`
Generates Convex schema and type definitions (runs once).

**Run this**:
- After cloning the repo
- After modifying `convex/schema.ts`

```bash
npm run generate
```

## Code Quality Scripts

### `npm run check-types`
Runs TypeScript type checking without emitting files.

```bash
npm run check-types
```

### `npm run lint`
Runs Prettier and ESLint checks.

```bash
npm run lint
```

### `npm run format`
Formats all code with Prettier.

```bash
npm run format
```

## Deployment Scripts

### `npm run deploy`
Deploys the web app to Cloudflare Workers using Wrangler.

**Requirements**: Wrangler must be configured

```bash
npm run deploy
```

### `npm run cf-typegen`
Generates TypeScript types for Cloudflare Workers environment.

```bash
npm run cf-typegen
```

## Common Workflows

### First-time Setup
```bash
# 1. Install all dependencies
npm install

# 2. Install voice agent dependencies
npm run voice:install

# 3. Generate Convex schema
npm run generate

# 4. Start development
npm run dev
```

### Development
```bash
# Start everything with hot reload
npm run dev

# In another terminal, expose voice agent (if testing Twilio)
ngrok http 8080
```

### Pre-deployment
```bash
# Check types
npm run check-types

# Format code
npm run format

# Build
npm run build:all
```

### Production Deployment

#### Local Production Test
```bash
# Build
npm run build:all

# Start (both services)
npm start
```

#### Cloudflare Workers (Web App Only)
```bash
npm run build
npm run deploy
```

#### Voice Agent Deployment
See [VOICE_AGENT_SETUP.md](VOICE_AGENT_SETUP.md) for:
- Google Cloud Run
- Railway
- Render
- Fly.io

## Script Dependencies

### `concurrently`
Used by `dev` and `start` scripts to run multiple processes.

Already installed as a dev dependency.

### Script Execution Order

**Development**:
```
npm run dev
  ├─> npm run dev:web
  ├─> npm run dev:db
  └─> npm run dev:voice
```

**Production**:
```
npm start
  ├─> npm run start:web
  └─> npm run start:voice
```

## Environment Variables

Scripts respect the following environment variables:

### Web App
- `PORT` - Web server port (default: 3000 in dev)
- `VITE_CONVEX_URL` - Convex deployment URL
- `CONVEX_SITE_URL` - Site URL for auth

### Voice Agent
- `PORT` - Voice agent port (default: 8080)
- `GOOGLE_CLOUD_PROJECT` - GCP project ID
- `GOOGLE_CLOUD_LOCATION` - GCP region
- `GOOGLE_APPLICATION_CREDENTIALS` - Service account path
- `CONVEX_URL` - Convex deployment URL
- `CONVEX_DEPLOY_KEY` - Convex deploy key

### Convex
- `VOICE_AGENT_URL` - Voice agent WebSocket URL

See `.env.example` and `voice-agent/.env.example` for complete list.

## Troubleshooting

### "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
npm run voice:install
```

### "Convex not found" errors
```bash
# Regenerate Convex schema
npm run generate
```

### Port conflicts
```bash
# Web app (change port)
PORT=3001 npm run dev:web

# Voice agent (change in voice-agent/.env)
echo "PORT=8081" >> voice-agent/.env
npm run dev:voice
```

### Production build fails
```bash
# Check types first
npm run check-types

# Build incrementally
npm run build       # Web app
npm run voice:install  # Voice agent
```

## Performance Tips

### Development
- Use `npm run dev` for full-stack development
- Use specific scripts (`dev:web`, `dev:voice`) when working on one service
- `dev:db` stays running in background, restart only when schema changes

### Production
- Always run `build:all` before deploying
- Use `start:web` and `start:voice` separately in production (different servers)
- Deploy voice agent separately from web app

## Script Aliases

Some scripts have multiple ways to run them:

| Task | Primary Script | Alias |
|------|---------------|-------|
| Start voice agent | `npm run start:voice` | `npm run voice:start` |
| Install voice deps | `npm run voice:install` | (cd voice-agent && npm install) |

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Install dependencies
  run: npm install

- name: Install voice agent
  run: npm run voice:install

- name: Type check
  run: npm run check-types

- name: Build
  run: npm run build:all

- name: Deploy
  run: npm run deploy
```

## Additional Resources

- [QUICKSTART.md](QUICKSTART.md) - Quick setup guide
- [VOICE_AGENT_SETUP.md](VOICE_AGENT_SETUP.md) - Voice agent deployment
- [package.json](package.json) - All scripts defined here
- [voice-agent/package.json](voice-agent/package.json) - Voice agent scripts
