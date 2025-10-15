import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const seedConvexQuiz = mutation({
  args: {},
  returns: v.object({
    quizId: v.id('quizzes'),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    // Check if quiz already exists
    const existingQuiz = await ctx.db
      .query('quizzes')
      .filter((q) => q.eq(q.field('title'), 'Convex Fundamentals'))
      .unique()

    if (existingQuiz) {
      return { quizId: existingQuiz._id }
    }

    // Create the quiz
    const quizId = await ctx.db.insert('quizzes', {
      title: 'Convex Fundamentals',
      description: 'Test your knowledge of Convex - the reactive backend for modern web apps!',
      createdBy: user._id,
      createdAt: Date.now(),
    })

    // Create questions
    const questions = [
      {
        questionText: 'What programming language does Convex use for backend functions?',
        options: ['Python', 'TypeScript/JavaScript', 'Go', 'Rust'],
        correctAnswerIndex: 1,
        timeLimit: 10,
      },
      {
        questionText: 'Which Convex function type is used to modify data?',
        options: ['Query', 'Mutation', 'Action', 'Loader'],
        correctAnswerIndex: 1,
        timeLimit: 10,
      },
      {
        questionText: 'What does Convex provide out of the box for real-time updates?',
        options: ['WebSockets', 'Reactive queries', 'Polling', 'Server-Sent Events'],
        correctAnswerIndex: 1,
        timeLimit: 10,
      },
      {
        questionText: 'What is the Convex database built on?',
        options: ['PostgreSQL', 'MongoDB', 'A custom reactive database', 'SQLite'],
        correctAnswerIndex: 2,
        timeLimit: 10,
      },
      {
        questionText: 'Which function type can call external APIs?',
        options: ['Query', 'Mutation', 'Action', 'All of the above'],
        correctAnswerIndex: 2,
        timeLimit: 10,
      },
      {
        questionText: 'What does Convex automatically handle for you?',
        options: [
          'Type safety',
          'Real-time subscriptions',
          'Database schema management',
          'All of the above',
        ],
        correctAnswerIndex: 3,
        timeLimit: 10,
      },
      {
        questionText: 'How does Convex handle authentication?',
        options: [
          'Built-in auth only',
          'OAuth providers only',
          'Flexible auth with multiple providers',
          'No auth support',
        ],
        correctAnswerIndex: 2,
        timeLimit: 10,
      },
      {
        questionText: 'What is the benefit of Convex queries being reactive?',
        options: [
          'Faster queries',
          'Automatic UI updates when data changes',
          'Better SEO',
          'Smaller bundle size',
        ],
        correctAnswerIndex: 1,
        timeLimit: 10,
      },
      {
        questionText: 'How does Convex handle file storage?',
        options: [
          'No file storage support',
          'External S3 only',
          'Built-in file storage with URLs',
          'Local file system',
        ],
        correctAnswerIndex: 2,
        timeLimit: 10,
      },
      {
        questionText: 'What makes Convex different from traditional databases?',
        options: [
          'It uses SQL',
          'Reactive queries that auto-update',
          'It requires manual caching',
          'No type safety',
        ],
        correctAnswerIndex: 1,
        timeLimit: 10,
      },
    ]

    for (let i = 0; i < questions.length; i++) {
      await ctx.db.insert('questions', {
        quizId,
        order: i,
        ...questions[i],
      })
    }

    return { quizId }
  },
})

