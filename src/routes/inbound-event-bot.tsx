import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/inbound-event-bot')({
    component: RouteComponent,
})

function RouteComponent() {
    return <div>Hello "/inbound-event-bot"!</div>
}
