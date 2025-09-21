import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start'
import { createRouter } from './router'
import * as Sentry from '@sentry/tanstackstart-react'
const router = createRouter()
Sentry.init({
  dsn: 'https://238ed7e0b8c33a786e0a19b534bda162@o4508130833793024.ingest.us.sentry.io/4509481458204672',
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
