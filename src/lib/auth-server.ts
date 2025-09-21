import { createAuth } from 'convex/auth'
import { setupFetchClient } from '@convex-dev/better-auth/react-start'
import { getCookie } from '@tanstack/react-start/server'

// Cache the auth client to avoid reinitializing on every call
let authClientPromise: ReturnType<typeof setupFetchClient> | null = null

function getAuthClient() {
  if (!authClientPromise) {
    authClientPromise = setupFetchClient(createAuth, getCookie)
  }
  return authClientPromise
}

// These helpers call Convex functions using a token from
// Better Auth's cookies, if available.
export async function fetchQuery(
  ...args: Parameters<
    Awaited<ReturnType<typeof setupFetchClient>>['fetchQuery']
  >
) {
  const client = await getAuthClient()
  return client.fetchQuery(...args)
}

export async function fetchMutation(
  ...args: Parameters<
    Awaited<ReturnType<typeof setupFetchClient>>['fetchMutation']
  >
) {
  const client = await getAuthClient()
  return client.fetchMutation(...args)
}

export async function fetchAction(
  ...args: Parameters<
    Awaited<ReturnType<typeof setupFetchClient>>['fetchAction']
  >
) {
  const client = await getAuthClient()
  return client.fetchAction(...args)
}
