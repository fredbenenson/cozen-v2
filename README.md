# Cozen v2: A Strategic Card Game API

## Overview

Cozen is a strategic card game of deception and skill, originally designed by Zach Gage. This TypeScript-based implementation provides a full-featured backend API for playing Cozen, complete with game logic, authentication, and WebSocket support.

## Game Rules

For a complete overview of game rules, please refer to the [RULES.md](RULES.md) file in the repository. Key highlights include:

- Two players (Red and Black) with unique decks
- Goal: Capture 70 Victory Points from opponent's cards
- Strategic gameplay involving staking and wagering cards
- Unique scoring system with pairs and straights

## Prerequisites

- Node.js (v20.0.0 or later)
- npm (v10.0.0 or later)
- MongoDB

## Installation

1. Clone the repository:
```bash
git clone https://github.com/fredbenenson/cozen-v2.git
cd cozen-v2
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root with the following variables:
```
MONGODB_URI=mongodb://localhost:27017/cozen
JWT_SECRET=your_jwt_secret_key
PORT=3000
```

## Configuration

### Environment Variables

- `MONGODB_URI`: Connection string for your MongoDB database
- `JWT_SECRET`: Secret key for JWT token generation
- `PORT`: Port number for the server (default: 3000)

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## Testing

### Run All Tests
```bash
npm test
```

### Watch Mode for Tests
```bash
npm run test:watch
```

### Test Coverage
```bash
npm run test:coverage
```

## CLI Interface

The application includes a CLI for testing and interacting with the game:

```bash
npm run cli
```

The CLI provides an interactive game setup where you can:
- Create test players
- Initialize a game
- Make moves (stake or play cards)
- Explore game state

### CLI Commands
- `stake <number> <column>`: Stake a card (e.g., `stake 5 2`)
- `play <number>,<number> <column>`: Play multiple cards (e.g., `play 3,4 1`)
- `quit`: Exit the game

## API Endpoints

### Authentication Routes
- `POST /auth/register`: Register a new player
- `POST /auth/login`: Authenticate a player
- `POST /auth/create-player`: Create a player without authentication

### Game Routes
- `POST /games/create`: Create a new game
- `POST /games/:gameId/move`: Make a move in an existing game

## WebSocket Events

The application uses Socket.IO for real-time game interactions:
- `joinGame`: Join a specific game room
- `makeMove`: Make a move and broadcast to game participants
- `moveUpdate`: Receive updates about game moves

## Development

### Linting
```bash
npm run lint
```

### Formatting
```bash
npm run format
```

## Project Structure

- `src/`
  - `config/`: Configuration files
  - `middleware/`: Express middleware
  - `models/`: Mongoose models
  - `routes/`: API route handlers
  - `services/`: Game logic and business services
  - `tests/`: Unit and integration tests
  - `types/`: TypeScript type definitions
  - `utils/`: Utility functions
  - `websocket/`: WebSocket configuration
  - `cli.ts`: Command-line interface
  - `index.ts`: Main application entry point

## Technologies

- TypeScript
- Express.js
- MongoDB (Mongoose)
- Socket.IO
- Jest (Testing)
- JWT (Authentication)
- bcryptjs (Password Hashing)
