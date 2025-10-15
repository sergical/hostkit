# Quiz Game - Quick Start Guide

## 🎮 What Was Built

A fully functional multiplayer Kahoot-style quiz game with:

- Real-time gameplay using Convex
- Beautiful UI with shadcn components
- Type-safe routing with TanStack Router
- Timed questions with scoring based on speed
- Live leaderboard
- Game lobby with shareable codes

## 🚀 Getting Started

### 1. Start the Development Server

```bash
npm run dev
```

This will start both the Vite dev server (port 3000) and Convex backend.

### 2. Sign In

Navigate to `http://localhost:3000` and sign in to the app (you should already have auth set up).

### 3. Create the Sample Quiz

1. Go to the Dashboard at `http://localhost:3000/dashboard`
2. Click the **"Create Sample Quiz"** button
3. This creates a 10-question quiz about Convex fundamentals

### 4. Test as Host (You)

1. On the dashboard, you'll see the "Convex Fundamentals" quiz card
2. Click **"Create Game"** button on the card
3. Click **"Create Game"** in the modal
4. You'll be redirected to the game lobby with:
   - A 6-character code (e.g., `ABC123`)
   - A QR code that players can scan to join instantly!

### 5. Test as Players (Open in Incognito Tabs)

For each player:

1. Open a new **incognito/private browser window**
2. Go to `http://localhost:3000/game/join?code=YOUR_CODE` (replace YOUR_CODE)
3. Enter a unique nickname (e.g., "Alice", "Bob", "Charlie")
4. Click **"Join Game"**
5. You'll see the lobby with other players

> **Tip**: Open 2-3 incognito windows to simulate multiple players!
>
> **Note**: Players do NOT need to sign in! They join anonymously with just a nickname.

### 6. Start and Play the Game

1. In the **host window** (your main browser), click **"Start Game"**
2. All windows will automatically move to the game screen
3. Players select their answers before time runs out
4. The host clicks **"Next Question"** to advance
5. Watch the leaderboard update in real-time!

### 7. View Results

After all 10 questions:

- Everyone is redirected to the results page
- See the winner's celebration
- View the full leaderboard with top 3 badges

## 📁 What Was Created

### Convex Backend (`/convex`)

- **`schema.ts`** - Database schema for quizzes, games, players, answers
- **`quiz.ts`** - All game mutations and queries
- **`seedQuiz.ts`** - Creates the sample Convex quiz

### React Components (`/src/components`)

- **`QuizManager.tsx`** - Dashboard quiz list and game creation
- **`JoinGame.tsx`** - Join screen with code entry
- **`GameLobby.tsx`** - Waiting room before game starts
- **`GamePlay.tsx`** - Main game screen with questions and timer
- **`GameResults.tsx`** - Final leaderboard and winner

### Routes (`/src/routes`)

- **`/dashboard`** - Updated to show QuizManager
- **`/game/join`** - Join a game with code
- **`/game/:gameId/lobby`** - Game lobby
- **`/game/:gameId/play`** - Active gameplay
- **`/game/:gameId/results`** - Final results

### UI Components Added

- **`dialog.tsx`** - Modal for game creation
- **`progress.tsx`** - Timer and progress bars

## 🎯 Testing Checklist

- [ ] Create sample quiz from dashboard
- [ ] Create a game as host
- [ ] Join game from incognito window
- [ ] Try joining with duplicate nickname (should fail)
- [ ] Try joining invalid code (should fail)
- [ ] Join with 2-3 players
- [ ] Start game as host
- [ ] Answer questions at different speeds
- [ ] Watch leaderboard update
- [ ] Let timer run out on a question
- [ ] Complete all questions
- [ ] View final results

## 🐛 Troubleshooting

### Players not seeing updates?

- Make sure Convex dev server is running (`npm run dev` runs both)
- Check browser console for errors

### Routes not working?

- The route tree is generated automatically by TanStack Start
- Restart the dev server if you see route errors

### Can't create quiz?

- Make sure you're signed in
- Check that Convex is connected (look for green dot in Convex dashboard)

## 🎨 Customization Ideas

1. **Add more quizzes**: Create more seed functions with different topics
2. **Custom time limits**: Adjust `timeLimit` in questions
3. **Different scoring**: Modify the scoring algorithm in `submitAnswer`
4. **Themes**: Add color themes for different quiz categories
5. **Sound effects**: Add audio for correct/incorrect answers
6. **Animations**: Enhance transitions with motion/framer-motion

## 📊 Database Structure

### Key Tables

- **quizzes**: Quiz metadata
- **questions**: Questions with options and correct answers
- **games**: Active game sessions (tracks status and current question)
- **players**: Player info and scores
- **answers**: Records of all submitted answers

### Game Flow States

1. `waiting` - Lobby, players can join
2. `in_progress` - Game is active
3. `finished` - Game completed, show results

## 🎓 Learning Points

This implementation demonstrates:

- Real-time multiplayer with Convex subscriptions
- Type-safe routing with dynamic segments
- Optimistic UI updates
- State management across multiple clients
- Responsive design with Tailwind CSS
- Component composition with shadcn/ui

Enjoy the quiz game! 🎉
