import { createFileRoute } from '@tanstack/react-router'
import { GamePlay } from '@/components/GamePlay'
import { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/game/$gameId/play')({
  component: GamePlayRoute,
})

function GamePlayRoute() {
  const { gameId } = Route.useParams()

  // Get player info from localStorage if they joined as a player
  const playerData =
    typeof window !== 'undefined' ? localStorage.getItem(`player_${gameId}`) : null

  const playerId = playerData ? (JSON.parse(playerData).playerId as Id<'players'>) : undefined
  const isHost = !playerData

  return <GamePlay gameId={gameId as Id<'games'>} playerId={playerId} isHost={isHost} />
}

