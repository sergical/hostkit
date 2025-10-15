# Quiz Game Feature

A multiplayer Kahoot-style quiz game built with Convex and TanStack Router.

## Features

- **Create Quiz Games**: Hosts can create games from available quizzes
- **Real-time Multiplayer**: Players join with a 6-character game code or QR code
- **QR Code Support**: Instant joining by scanning a QR code with your phone
- **Live Leaderboard**: See scores update in real-time during gameplay
- **Timed Questions**: Each question has a time limit with bonus points for speed
- **Beautiful UI**: Modern, responsive design with smooth animations

## How to Use

### 1. Create Sample Quiz

1. Navigate to the dashboard at `/dashboard`
2. Click "Create Sample Quiz" to generate a Convex fundamentals quiz
3. This will create a quiz with 10 questions about Convex

### 2. Host a Game

1. On the dashboard, click "Create Game" on any quiz card
2. You'll be redirected to the game lobby
3. Share with players:
   - The 6-character game code (they can type it in)
   - The QR code (they can scan with their phone)
   - Or copy/share the direct URL
4. Once players have joined, click "Start Game" to begin

### 3. Join a Game (as a Player)

1. Join in one of three ways:
   - Scan the QR code with your phone camera (easiest!)
   - Click the shared link
   - Go to `/game/join` and enter the 6-character code
2. Choose a unique nickname
3. Click "Join Game"
4. Wait in the lobby for the host to start

### 4. Play the Game

- Read each question carefully
- Select your answer before time runs out
- Correct answers earn points (more points for faster answers)
- Watch the leaderboard to see your ranking
- The host advances to the next question after everyone answers

### 5. View Results

- After all questions are answered, see the final leaderboard
- Top 3 players get special badges
- Click "Back to Dashboard" to create another game

## Architecture

### Convex Schema

- **quizzes**: Quiz metadata (title, description)
- **questions**: Quiz questions with options and correct answers
- **games**: Active game sessions with status tracking
- **players**: Players in each game with scores
- **answers**: Player answers with timing and correctness

### Convex Functions

#### Mutations

- `createGame`: Create a new game session
- `joinGame`: Join an existing game
- `startGame`: Host starts the game
- `submitAnswer`: Submit an answer to a question
- `nextQuestion`: Advance to next question (host only)
- `seedConvexQuiz`: Create sample quiz

#### Queries

- `getAllQuizzes`: Get all available quizzes
- `getGame`: Get game details
- `getGameByCode`: Find game by code
- `getPlayers`: Get all players in a game
- `getCurrentQuestion`: Get current question (without answer)
- `getPlayerAnswer`: Get player's answer for a question

### Routes

- `/dashboard` - Main dashboard with quiz list
- `/game/join` - Join a game with code
- `/game/:gameId/lobby` - Game lobby (waiting room)
- `/game/:gameId/play` - Active gameplay
- `/game/:gameId/results` - Final results and leaderboard

### Components

- `QuizManager` - Browse and create games from quizzes
- `JoinGame` - Enter game code and nickname
- `GameLobby` - Waiting room with player list
- `GamePlay` - Main game interface with questions
- `GameResults` - Final leaderboard and winner announcement

## Scoring System

- Base points: 1000 for correct answer
- Time bonus: Up to 50% extra points for quick answers
- No points for incorrect answers
- Final score is cumulative across all questions

## Tech Stack

- **Convex**: Real-time backend and database
- **TanStack Router**: Type-safe routing
- **shadcn/ui**: Beautiful UI components
- **kibo-ui**: QR code component for instant joining
- **React**: Frontend framework
- **TypeScript**: Type safety throughout

## Future Enhancements

- Custom quiz creation in UI
- Question images and multimedia
- Team mode
- Power-ups and special abilities
- Quiz analytics and statistics
- Social sharing of results
