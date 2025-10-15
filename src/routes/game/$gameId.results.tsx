import { createFileRoute } from '@tanstack/react-router'
import { GameResults } from '@/components/GameResults'
import { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/game/$gameId/results')({
  component: GameResultsRoute,
})

function GameResultsRoute() {
  const { gameId } = Route.useParams()

  return <GameResults gameId={gameId as Id<'games'>} />
}

