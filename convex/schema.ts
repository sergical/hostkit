import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  users: defineTable({
    email: v.string(),
  }).index('email', ['email']),

  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
    userId: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('userId', ['userId']),

  calls: defineTable({
    callSid: v.string(),
    phoneNumber: v.string(),
    direction: v.union(v.literal('inbound'), v.literal('outbound')),
    status: v.string(),
    duration: v.optional(v.number()),
    transcript: v.optional(v.string()),
    userId: v.optional(v.id('users')),
    eventId: v.optional(v.id('events')),
  })
    .index('by_callSid', ['callSid'])
    .index('by_userId', ['userId']),

  events: defineTable({
    name: v.string(),
    description: v.string(),
    date: v.number(),
    location: v.string(),
  }),

  attendees: defineTable({
    eventId: v.id('events'),
    phoneNumber: v.string(),
    name: v.string(),
    status: v.union(v.literal('confirmed'), v.literal('cancelled'), v.literal('pending')),
  })
    .index('by_event', ['eventId'])
    .index('by_phone_and_event', ['phoneNumber', 'eventId']),

  // Quiz Game Tables
  quizzes: defineTable({
    title: v.string(),
    description: v.string(),
    createdBy: v.id('users'),
    createdAt: v.number(),
  }).index('by_user', ['createdBy']),

  questions: defineTable({
    quizId: v.id('quizzes'),
    questionText: v.string(),
    options: v.array(v.string()),
    correctAnswerIndex: v.number(),
    order: v.number(),
    timeLimit: v.number(), // in seconds
  }).index('by_quiz_and_order', ['quizId', 'order']),

  games: defineTable({
    quizId: v.id('quizzes'),
    hostId: v.id('users'),
    status: v.union(
      v.literal('waiting'),
      v.literal('in_progress'),
      v.literal('finished')
    ),
    currentQuestionIndex: v.number(),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    code: v.string(), // 6-character game code
  })
    .index('by_code', ['code'])
    .index('by_host', ['hostId'])
    .index('by_status', ['status']),

  players: defineTable({
    gameId: v.id('games'),
    nickname: v.string(),
    score: v.number(),
    joinedAt: v.number(),
  }).index('by_game_and_score', ['gameId', 'score']),

  answers: defineTable({
    gameId: v.id('games'),
    playerId: v.id('players'),
    questionIndex: v.number(),
    answerIndex: v.number(),
    isCorrect: v.boolean(),
    timeToAnswer: v.number(), // in milliseconds
    answeredAt: v.number(),
  })
    .index('by_game_and_question', ['gameId', 'questionIndex'])
    .index('by_player_and_question', ['playerId', 'questionIndex']),
})
