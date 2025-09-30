import ResetPassword from '@/components/ResetPassword'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/inbound-event-bot')({
  component: ResetPassword
})
