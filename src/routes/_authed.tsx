import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => {
    if (!context.userId) {
      throw redirect({ to: '/sign-in' })
    }
    // Redirect root auth route to dashboard
    if (location.pathname === '/') {
      throw redirect({ to: '/dashboard' })
    }
  },
})
