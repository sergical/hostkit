import { createFileRoute } from '@tanstack/react-router'
import { JoinGame } from '@/components/JoinGame'

export const Route = createFileRoute('/game/join')({
  component: JoinGameRoute,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      code: (search.code as string) || undefined,
    }
  },
})

function JoinGameRoute() {
  const { code } = Route.useSearch()
  return <JoinGame initialCode={code} />
}

