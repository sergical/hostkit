import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'

import { createRouter } from './router'
import * as Sentry from '@sentry/tanstackstart-react'

Sentry.init({
  dsn: 'https://238ed7e0b8c33a786e0a19b534bda162@o4508130833793024.ingest.us.sentry.io/4509481458204672',

  sendDefaultPii: true,

  enableLogs: true,

  tracesSampleRate: 1.0,
})

export default createStartHandler({
  createRouter,
})(Sentry.wrapStreamHandlerWithSentry(defaultStreamHandler))
