import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { Loader2, Clock } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

interface GamePlayProps {
  gameId: Id<'games'>
  playerId?: Id<'players'>
  isHost: boolean
}

export function GamePlay({ gameId, playerId, isHost }: GamePlayProps) {
  const gameData = useQuery(api.quiz.getGame, { gameId })
  const players = useQuery(api.quiz.getPlayers, { gameId })
  const currentQuestion = useQuery(api.quiz.getCurrentQuestion, { gameId })
  const playerAnswer = useQuery(
    api.quiz.getPlayerAnswer,
    playerId ? { playerId, questionIndex: gameData?.game.currentQuestionIndex ?? 0 } : 'skip'
  )
  const submitAnswer = useMutation(api.quiz.submitAnswer)
  const nextQuestion = useMutation(api.quiz.nextQuestion)

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [questionStartTime, setQuestionStartTime] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; pointsEarned: number } | null>(
    null
  )
  const navigate = useNavigate()

  // Initialize timer when question changes
  useEffect(() => {
    if (currentQuestion && !playerAnswer) {
      setTimeLeft(currentQuestion.timeLimit)
      setQuestionStartTime(Date.now())
      setSelectedAnswer(null)
      setShowResults(false)
      setLastResult(null)
    }
  }, [currentQuestion?.order, playerAnswer])

  // Timer countdown
  useEffect(() => {
    if (!currentQuestion || playerAnswer || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [currentQuestion, playerAnswer, timeLeft])

  // Auto-advance when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !playerAnswer && selectedAnswer === null && !showResults) {
      setShowResults(true)
    }
  }, [timeLeft, playerAnswer, selectedAnswer, showResults])

  // Redirect to results when game finishes
  useEffect(() => {
    if (gameData?.game.status === 'finished') {
      navigate({ to: `/game/${gameId}/results` })
    }
  }, [gameData?.game.status, gameId, navigate])

  const handleSelectAnswer = async (index: number) => {
    if (playerAnswer || !playerId || !currentQuestion) return

    setSelectedAnswer(index)
    setIsSubmitting(true)

    try {
      const timeToAnswer = Date.now() - questionStartTime
      const result = await submitAnswer({
        playerId,
        questionIndex: gameData?.game.currentQuestionIndex ?? 0,
        answerIndex: index,
        timeToAnswer,
      })
      setLastResult(result)
      // Don't show results immediately - wait for timer to expire
    } catch (error) {
      console.error('Failed to submit answer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNextQuestion = async () => {
    if (!isHost) return
    try {
      await nextQuestion({ gameId })
      setShowResults(false)
    } catch (error) {
      console.error('Failed to advance question:', error)
    }
  }

  if (!gameData || !players || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const progress = ((gameData.game.currentQuestionIndex + 1) / gameData.totalQuestions) * 100
  const hasAnswered = !!playerAnswer

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{gameData.quiz.title}</h2>
          <p className="text-sm text-muted-foreground">
            Question {gameData.game.currentQuestionIndex + 1} of {gameData.totalQuestions}
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Users className="mr-2 h-4 w-4" />
          {players.length}
        </Badge>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-2" />

      {/* Timer */}
      <Card className={cn('border-2', timeLeft <= 5 && 'border-destructive animate-pulse')}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-semibold">Time Remaining</span>
            </div>
            <span className="text-2xl font-bold">{timeLeft}s</span>
          </div>
          <Progress value={(timeLeft / currentQuestion.timeLimit) * 100} className="mt-2" />
        </CardContent>
      </Card>

      {/* Question */}
      <Card className="border-2 border-primary">
        <CardContent className="p-8">
          <h3 className="text-3xl font-bold text-center mb-8">{currentQuestion.questionText}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index
              const isPlayerAnswer = playerAnswer?.answerIndex === index

              return (
                <Button
                  key={index}
                  variant={isSelected || isPlayerAnswer ? 'default' : 'outline'}
                  className={cn(
                    'h-auto min-h-[80px] text-lg p-6 transition-all',
                    (isSelected || isPlayerAnswer) && 'ring-2 ring-primary'
                  )}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={hasAnswered || isSubmitting || timeLeft === 0}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="flex-1 text-left">{option}</span>
                  </div>
                </Button>
              )
            })}
          </div>

          {/* Answer feedback - only shown when timer expires */}
          {timeLeft === 0 && lastResult && (
            <div className="mt-6 p-4 rounded-lg bg-muted text-center">
              {lastResult.isCorrect ? (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-green-600">Correct! 🎉</p>
                  <p className="text-lg">
                    You earned <strong>{lastResult.pointsEarned}</strong> points!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-destructive">Incorrect</p>
                  <p className="text-muted-foreground">Better luck next time!</p>
                </div>
              )}
            </div>
          )}

          {timeLeft === 0 && !lastResult && !hasAnswered && (
            <div className="mt-6 p-4 rounded-lg bg-muted text-center">
              <p className="text-lg text-muted-foreground">Time's up! You didn't answer.</p>
            </div>
          )}
          
          {hasAnswered && timeLeft > 0 && (
            <div className="mt-6 p-4 rounded-lg bg-muted text-center">
              <p className="text-lg text-muted-foreground">Answer submitted! Waiting for time to expire...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Host controls */}
      {isHost && timeLeft === 0 && (
        <div className="flex justify-center">
          <Button size="lg" onClick={handleNextQuestion} className="text-lg px-8">
            {gameData.game.currentQuestionIndex + 1 >= gameData.totalQuestions
              ? 'Finish Game'
              : 'Next Question'}
          </Button>
        </div>
      )}
    </div>
  )
}

function Users({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

