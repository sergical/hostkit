import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Loader2, Trophy, Medal, Home } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

interface GameResultsProps {
  gameId: Id<'games'>
}

export function GameResults({ gameId }: GameResultsProps) {
  const gameData = useQuery(api.quiz.getGame, { gameId })
  const players = useQuery(api.quiz.getPlayers, { gameId })
  const navigate = useNavigate()

  if (!gameData || !players) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const winner = sortedPlayers[0]

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      {/* Winner Announcement */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20 mb-4">
          <Trophy className="h-10 w-10 text-yellow-500" />
        </div>
        <h1 className="text-4xl font-bold">Game Over!</h1>
        <p className="text-2xl text-muted-foreground">{gameData.quiz.title}</p>
      </div>

      {/* Winner Podium */}
      {winner && (
        <Card className="border-2 border-yellow-500 bg-gradient-to-br from-yellow-500/10 to-transparent">
          <CardContent className="p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-500/20 mb-2">
              <Avatar className="h-20 w-20 border-4 border-yellow-500">
                <AvatarFallback className="text-3xl font-bold bg-yellow-500 text-white">
                  {winner.nickname.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <Badge variant="default" className="mb-2 bg-yellow-500 text-white">
                🏆 Winner
              </Badge>
              <h2 className="text-3xl font-bold">{winner.nickname}</h2>
              <p className="text-4xl font-bold text-yellow-600 mt-2">{winner.score} points</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Leaderboard */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-2xl font-bold mb-6 text-center">Final Standings</h3>
          <div className="space-y-3">
            {sortedPlayers.map((player, index) => {
              const isWinner = index === 0
              const isSecond = index === 1
              const isThird = index === 2

              return (
                <div
                  key={player._id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                    isWinner
                      ? 'bg-yellow-500/10 border-2 border-yellow-500'
                      : isSecond
                        ? 'bg-gray-300/10 border-2 border-gray-400'
                        : isThird
                          ? 'bg-orange-500/10 border-2 border-orange-600'
                          : 'bg-muted/50'
                  }`}
                >
                  {/* Position */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-background flex items-center justify-center">
                    {isWinner ? (
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    ) : isSecond ? (
                      <Medal className="h-6 w-6 text-gray-400" />
                    ) : isThird ? (
                      <Medal className="h-6 w-6 text-orange-600" />
                    ) : (
                      <span className="text-lg font-bold">{index + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar
                    className={`h-10 w-10 ${
                      isWinner
                        ? 'ring-2 ring-yellow-500'
                        : isSecond
                          ? 'ring-2 ring-gray-400'
                          : isThird
                            ? 'ring-2 ring-orange-600'
                            : ''
                    }`}
                  >
                    <AvatarFallback
                      className={
                        isWinner
                          ? 'bg-yellow-500 text-white'
                          : isSecond
                            ? 'bg-gray-400 text-white'
                            : isThird
                              ? 'bg-orange-600 text-white'
                              : ''
                      }
                    >
                      {player.nickname.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{player.nickname}</p>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className="text-2xl font-bold">{player.score}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={() => navigate({ to: '/dashboard' })}>
          <Home className="mr-2 h-5 w-5" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}

