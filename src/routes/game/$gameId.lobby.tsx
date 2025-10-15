import { createFileRoute } from '@tanstack/react-router'
import { GameLobby } from '@/components/GameLobby'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/game/$gameId/lobby')({
  component: GameLobbyRoute,
})

function GameLobbyRoute() {
  const { gameId } = Route.useParams()
  const gameData = useQuery(api.quiz.getGame, { gameId: gameId as Id<'games'> })

  // Check if user is the host by checking localStorage or auth
  const isHost = typeof window !== 'undefined' && !localStorage.getItem(`player_${gameId}`)

  return <GameLobby gameId={gameId as Id<'games'>} isHost={isHost} />
}

