import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start'
import { createRouter } from './router'
import * as Sentry from '@sentry/tanstackstart-react'
const router = createRouter()
Sentry.init({
  dsn: 'https://8e9cfc8584c49677555954c0f51f8a56@o4505994951065600.ingest.us.sentry.io/4510058209476608',
  sendDefaultPii: true,
  integrations: [
    Sentry.tanstackRouterBrowserTracingIntegration(router),
    Sentry.replayIntegration(),
  ],

  enableLogs: true,

  tracesSampleRate: 1.0,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
hydrateRoot(document, <StartClient router={router} />)
