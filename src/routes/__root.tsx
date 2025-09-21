import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
  useRouteContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { createServerFn } from '@tanstack/react-start'
import { Scripts } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import * as React from 'react'
import appCss from '@/styles/app.css?url'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { authClient } from '@/lib/auth-client'
import {
  fetchSession,
  getCookieName,
} from '@convex-dev/better-auth/react-start'
import { getCookie, getWebRequest } from '@tanstack/react-start/server'
import { seo } from '@/utils/seo'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { wrapCreateRootRouteWithSentry } from '@sentry/tanstackstart-react'
import { ThemeProvider, useTheme } from '@/components/theme-provider'
import { getThemeServerFn } from '@/lib/theme'
import { ThemeSwitcher } from '@/components/theme-switcher'

// Get auth information for SSR using available cookies
const fetchAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { createAuth } = await import('@convex/auth')
  const { session } = await fetchSession(getWebRequest())
  const sessionCookieName = getCookieName(createAuth)
  const token = getCookie(sessionCookieName)
  return {
    userId: session?.user.id,
    token,
  }
})

export const Route = wrapCreateRootRouteWithSentry(
  createRootRouteWithContext<{
    queryClient: QueryClient
    convexQueryClient: ConvexQueryClient
  }>()({
    head: () => ({
      meta: [
        {
          charSet: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        ...seo({
          title: 'Convex + Better Auth + TanStack Start',
          description: `Convex + Better Auth + TanStack Start`,
        }),
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', href: '/favicon.ico' },
      ],
    }),
    beforeLoad: async (ctx) => {
      const { userId, token } = await fetchAuth()

      // During SSR only (the only time serverHttpClient exists),
      // set the auth token to make HTTP queries with.
      if (token) {
        ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
      }

      return {
        userId,
        token,
      }
    },
    component: RootComponent,
    loader: () => getThemeServerFn(),
  }),
)

function RootComponent() {
  const context = useRouteContext({ from: Route.id })
  const data = Route.useLoaderData()

  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
    >
      <ThemeProvider theme={data}>
        <RootDocument>
          <Outlet />
        </RootDocument>
      </ThemeProvider>
    </ConvexBetterAuthProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme()
  return (
    <html suppressHydrationWarning lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    // Get theme from cookie
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('ui-theme='))
      ?.split('=')[1] || 'system';
    
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (cookieValue === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(cookieValue);
    }
  } catch (e) {
    // Fallback to light theme if anything goes wrong
    document.documentElement.classList.add('light');
  }
})();
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground">
        <div className="absolute top-4 right-4 z-50">
          <ThemeSwitcher value={theme} onChange={setTheme} />
        </div>
        {children}

        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
