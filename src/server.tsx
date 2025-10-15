import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'

import { createRouter } from './router'
import * as Sentry from '@sentry/tanstackstart-react'

Sentry.init({
  dsn: 'https://8e9cfc8584c49677555954c0f51f8a56@o4505994951065600.ingest.us.sentry.io/4510058209476608',

  sendDefaultPii: true,

  enableLogs: true,

  tracesSampleRate: 1.0,
})

export default createStartHandler({
  createRouter,
})(Sentry.wrapStreamHandlerWithSentry(defaultStreamHandler))
