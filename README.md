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
- MongoDB (for original implementation)

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

3. For the original implementation, create a `.env` file in the project root with:
```
MONGODB_URI=mongodb://localhost:27017/cozen
JWT_SECRET=your_jwt_secret_key
PORT=3000
```

## Running the Application

### Original Implementation

```bash
npm start
```

### Boardgame.io Implementation (New!)

The project now includes a boardgame.io-based implementation that provides better state management and multiplayer capabilities.

To run the boardgame.io server:
```bash
npm run start:boardgame
```

To test the implementation in console mode:
```bash
npm run test:boardgame
```

For development with auto-reload:
```bash
npm run dev:boardgame
```

## Boardgame.io Implementation

The new boardgame.io implementation offers several advantages:

- Improved state management with immutable updates
- Built-in multiplayer server
- AI support with Monte Carlo Tree Search
- Better separation of game logic and UI

See the [boardgame implementation README](src/boardgame/README.md) for more details.

## CLI Interface

The original implementation includes a CLI for testing and interacting with the game:

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

## API Endpoints (Original Implementation)

### Authentication Routes
- `POST /auth/register`: Register a new player
- `POST /auth/login`: Authenticate a player
- `POST /auth/create-player`: Create a player without authentication

### Game Routes
- `POST /games/create`: Create a new game
- `POST /games/:gameId/move`: Make a move in an existing game

## Project Structure

- `src/`
  - `boardgame/`: Boardgame.io implementation (NEW!)
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
- boardgame.io (New implementation)
- React (for boardgame.io UI)