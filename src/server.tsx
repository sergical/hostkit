import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'

import { createRouter } from './router'
import * as Sentry from '@sentry/tanstackstart-react'

Sentry.init({
  dsn: 'https://238ed7e0b8c33a786e0a19b534bda162@o4508130833793024.ingest.us.sentry.io/4509481458204672',
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  //  logs
  // Enable logs to be sent to Sentry
  enableLogs: true,
  //  logs
  //  performance
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  tracesSampleRate: 1.0,
  //  performance
})

export default createStartHandler({
  createRouter,
})(Sentry.wrapStreamHandlerWithSentry(defaultStreamHandler))
