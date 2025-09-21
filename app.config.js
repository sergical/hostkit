// app.config.ts
import { defineConfig } from '@tanstack/react-start/config'
import tsConfigPaths from 'vite-tsconfig-paths'
import { wrapVinxiConfigWithSentry } from '@sentry/tanstackstart-react'

var app_config_default = defineConfig({
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
  },
  server: {
    routeRules: {
      '/api/auth/**': {
        proxy: {
          to: 'https://outstanding-bison-162.convex.site/api/auth/**',
        },
      },
    },
  },
})

export default wrapVinxiConfigWithSentry(app_config_default, {
  org: 'sergtech',
  project: 'hostkit',
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  // Set to `true` to suppress logs
  silent: !process.env.CI,
})
