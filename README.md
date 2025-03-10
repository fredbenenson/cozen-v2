# Cozen: A Strategic Card Game

## Overview

Cozen is a strategic card game of deception and skill, originally designed by Zach Gage. This implementation is built using TypeScript and the boardgame.io framework, providing an interactive digital version with AI opponent capabilities.

## Game Rules

For a complete overview of game rules, please refer to the [RULES.md](RULES.md) file in the repository. Key highlights include:

- Two players (Red and Black) with unique decks
- Goal: Capture 70 Victory Points from opponent's cards
- Strategic gameplay involving staking and wagering cards
- Unique scoring system with pairs and straights

## Prerequisites

- Node.js (v20.0.0 or later)
- npm (v10.0.0 or later)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/fredbenenson/cozen.git
cd cozen
```

2. Install dependencies:
```bash
npm install
```

## Running the Game

To start the development server:
```bash
npm run dev
```

To build for production:
```bash
npm run build
```

## Boardgame.io Implementation

This project uses boardgame.io as its core framework, which provides:

- Structured game state management
- Turn-based gameplay logic
- Event handling for game actions
- Client/server architecture for multiplayer
- AI player support

The main boardgame.io components include:

- `CozenGame.ts`: Core game logic and move definitions
- `Board.tsx`: React UI component for rendering the game board
- `setup.ts`: Initial game state and setup functions
- `moves.ts`: Game move implementations
- `turnOrder.ts`: Turn order management
- `server.ts`: Server configuration for multiplayer

## AI Implementation

The game includes an AI opponent that:

- Uses a minimax algorithm with alpha-beta pruning
- Evaluates board positions based on card value and positioning
- Makes strategic decisions about staking and wagering cards
- Provides a challenging gameplay experience

The AI components are in the `src/ai` directory.

## Project Structure

- `src/`
  - `ai/`: AI player implementation
  - `components/`: React UI components
  - `game/`: Core boardgame.io game logic
  - `services/`: Game services and utilities
  - `types/`: TypeScript type definitions
  - `utils/`: Utility functions
  - `index.tsx`: Main application entry point

## Game Visualization

For debugging and development purposes, the project includes visualization tools:

- Minimax decision tree visualizer
- Game state renderer
- Board state debugger

These tools can be found in the `visualizations/` directory.

## TODO

- **Security Enhancement**: Implement proper information hiding for opponent's cards on the server side. Currently, all card information is sent to the client and visually hidden with CSS, which is not secure for a production environment.
- Improve AI decision making for late-game scenarios
- Add comprehensive test coverage for game logic
- Implement multiplayer matchmaking
- Create tutorial mode for new players
- Add animations for card movements
- Optimize performance for mobile devices

## Technologies

- TypeScript
- React
- boardgame.io
- Node.js
- CSS
