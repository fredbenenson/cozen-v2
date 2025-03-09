# Cozen Card Game - boardgame.io Implementation

This is the boardgame.io implementation of Cozen, a strategic card game. 

## Initial Setup

Before running the game for the first time:

```bash
# Install all dependencies with the correct versions
npm install
npm install boardgame.io@^0.44.0 --save
npm install --save-dev webpack-cli webpack-dev-server ts-loader
```

## Quick Start (Development Mode)

The easiest way to start the game:

```bash
# Run the development server with a single command
./dev-game.sh
```

This will:
- Start a webpack development server with hot reloading
- Automatically open your browser to http://localhost:8000/
- Update the game as you make changes to the code

## Production Mode

To build and run the game in production mode:

```bash
# Build the bundle first
npm run build:boardgame

# Option 1: Open the standalone HTML file
open cozen-game.html

# Option 2: Run the server
npm run start:boardgame
# Then visit http://localhost:8000/
```

## Troubleshooting

If the game screen appears blank:

1. Make sure you have the correct version of boardgame.io installed:
```bash
npm install boardgame.io@^0.44.0 --save
```

2. Rebuild the game bundle:
```bash
npm run build:boardgame
```

3. Try the development server instead:
```bash
npm run dev:boardgame
```

4. Check the browser console for errors (F12 → Console tab)

5. If you see module not found errors, try:
```bash
# Clean and reinstall dependencies
rm -rf node_modules
npm install
npm install boardgame.io@^0.44.0 --save
npm install --save-dev webpack-cli webpack-dev-server ts-loader
```

## Game Architecture

- **Frontend**: React components with boardgame.io client
- **Backend**: Express server with boardgame.io server
- **State Management**: Handled by boardgame.io

## Key Files

- `src/boardgame/CozenGame.ts` - Main game definition
- `src/boardgame/moves.ts` - Game moves implementation (stakeCard and wagerCards)
- `src/boardgame/components/EnhancedBoard.tsx` - UI component for the game board
- `src/boardgame/utils/boardUtils.ts` - Board management functions
- `src/boardgame/utils/cardEvaluation.ts` - Card evaluation logic for contests
- `src/boardgame/types/index.ts` - Type definitions

## Card Drawing Logic

- Players draw cards when they stake, but not when they wager
- Players start with 5 cards in hand
- Players draw one card from their deck after a stake move
- When a player's hand is empty, the "last_play" state is triggered
- When both players have empty hands, the round is complete