import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Badge } from './ui/badge'
import { Loader2, Copy, Check, Users, Play, QrCode as QrCodeIcon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { QRCode } from './kibo-ui/qr-code'

interface GameLobbyProps {
  gameId: Id<'games'>
  isHost: boolean
}

export function GameLobby({ gameId, isHost }: GameLobbyProps) {
  const gameData = useQuery(api.quiz.getGame, { gameId })
  const players = useQuery(api.quiz.getPlayers, { gameId })
  const startGame = useMutation(api.quiz.startGame)
  const [copied, setCopied] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to play screen when game starts
    if (gameData?.game.status === 'in_progress') {
      navigate({ to: `/game/${gameId}/play` })
    }
  }, [gameData?.game.status, gameId, navigate])

  const handleCopyCode = async () => {
    if (gameData?.game.code) {
      await navigator.clipboard.writeText(gameData.game.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleStartGame = async () => {
    if (!isHost) return
    setIsStarting(true)
    try {
      await startGame({ gameId })
    } catch (error) {
      console.error('Failed to start game:', error)
      alert('Failed to start game. Please try again.')
    } finally {
      setIsStarting(false)
    }
  }

  if (!gameData || !players) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const shareUrl = `${window.location.origin}/game/join?code=${gameData.game.code}`

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">{gameData.quiz.title}</h1>
        <p className="text-muted-foreground">{gameData.quiz.description}</p>
      </div>

      <Card className="border-2 border-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Game Code</CardTitle>
          <CardDescription>Share this code or scan the QR code to join</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            {/* Game Code Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <code className="text-5xl font-bold tracking-wider bg-muted px-6 py-3 rounded-lg">
                  {gameData.game.code}
                </code>
                <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Or share this link:</p>
                <div className="flex items-center gap-2 justify-center">
                  <code className="text-xs bg-muted px-3 py-1 rounded max-w-[200px] truncate">
                    {shareUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <QRCode data={shareUrl} className="w-[200px] h-[200px]" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <QrCodeIcon className="h-4 w-4" />
                <span>Scan to join instantly</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Players ({players.length})</CardTitle>
            </div>
            <Badge variant="secondary">{gameData.totalQuestions} questions</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Waiting for players to join...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {players.map((player) => (
                <div
                  key={player._id}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-lg font-semibold">
                      {player.nickname.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm text-center">{player.nickname}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isHost && (
        <div className="flex justify-center">
          <Button
            size="lg"
            className="text-lg px-8"
            onClick={handleStartGame}
            disabled={players.length === 0 || isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Start Game
              </>
            )}
          </Button>
        </div>
      )}

      {!isHost && (
        <div className="text-center text-muted-foreground">
          Waiting for the host to start the game...
        </div>
      )}
    </div>
  )
}

