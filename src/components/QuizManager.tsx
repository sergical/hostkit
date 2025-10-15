import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useNavigate } from '@tanstack/react-router'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Loader2, Play, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Badge } from './ui/badge'

export function QuizManager() {
  const quizzes = useQuery(api.quiz.getAllQuizzes)
  const createGame = useMutation(api.quiz.createGame)
  const seedQuiz = useMutation(api.seedQuiz.seedConvexQuiz)
  const [isCreating, setIsCreating] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const navigate = useNavigate()

  const handleCreateGame = async (quizId: string) => {
    setIsCreating(true)
    try {
      const result = await createGame({ quizId: quizId as any })
      navigate({ to: `/game/${result.gameId}/lobby` })
    } catch (error) {
      console.error('Failed to create game:', error)
      alert('Failed to create game. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSeedQuiz = async () => {
    setIsSeeding(true)
    try {
      await seedQuiz()
    } catch (error) {
      console.error('Failed to seed quiz:', error)
      alert('Failed to create quiz. Please try again.')
    } finally {
      setIsSeeding(false)
    }
  }

  if (quizzes === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quiz Games</h2>
          <p className="text-muted-foreground">Create a game and invite players to join</p>
        </div>
        {quizzes.length === 0 && (
          <Button onClick={handleSeedQuiz} disabled={isSeeding}>
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Sample Quiz
              </>
            )}
          </Button>
        )}
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Play className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No quizzes yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating a sample Convex quiz to test the game!
            </p>
            <Button onClick={handleSeedQuiz} disabled={isSeeding}>
              {isSeeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Sample Quiz
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Card key={quiz._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{quiz.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{quiz.questionCount} questions</Badge>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full" disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Create Game
                        </>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create a new game</DialogTitle>
                      <DialogDescription>
                        You'll be the host and can start the game once players join.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Quiz: {quiz.title}</p>
                        <p className="text-sm text-muted-foreground">{quiz.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {quiz.questionCount} questions
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <DialogTrigger asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogTrigger>
                      <Button onClick={() => handleCreateGame(quiz._id)} disabled={isCreating}>
                        {isCreating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Game'
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

