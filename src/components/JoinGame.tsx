import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useNavigate } from '@tanstack/react-router'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Loader2, Users } from 'lucide-react'

interface JoinGameProps {
  initialCode?: string
}

export function JoinGame({ initialCode }: JoinGameProps) {
  const [code, setCode] = useState(initialCode?.toUpperCase() || '')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const joinGame = useMutation(api.quiz.joinGame)
  const navigate = useNavigate()

  // Check if game exists
  const gameData = useQuery(
    api.quiz.getGameByCode,
    code.length === 6 ? { code: code.toUpperCase() } : 'skip'
  )

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-character game code')
      return
    }

    if (!nickname || nickname.trim().length < 2) {
      setError('Please enter a nickname (at least 2 characters)')
      return
    }

    setIsJoining(true)
    try {
      const result = await joinGame({
        code: code.toUpperCase(),
        nickname: nickname.trim(),
      })
      // Store player info in localStorage for this session
      localStorage.setItem(
        `player_${result.gameId}`,
        JSON.stringify({
          playerId: result.playerId,
          nickname: nickname.trim(),
        })
      )
      navigate({ to: `/game/${result.gameId}/lobby` })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="container max-w-md mx-auto p-6 min-h-screen flex items-center justify-center">
      <Card className="w-full">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-3xl">Join Game</CardTitle>
          <CardDescription>Enter the game code to join</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Game Code</Label>
              <Input
                id="code"
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                className="text-center text-2xl font-bold tracking-wider"
                maxLength={6}
                required
              />
              {code.length === 6 && gameData === null && (
                <p className="text-sm text-destructive">Game not found</p>
              )}
              {gameData && gameData.status !== 'waiting' && (
                <p className="text-sm text-destructive">This game has already started</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Your Nickname</Label>
              <Input
                id="nickname"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                maxLength={20}
                required
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full text-lg"
              size="lg"
              disabled={
                isJoining ||
                code.length !== 6 ||
                !nickname ||
                gameData === null ||
                (gameData && gameData.status !== 'waiting')
              }
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Game'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

