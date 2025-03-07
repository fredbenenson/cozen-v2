# Cozen boardgame.io Implementation

This directory contains the boardgame.io implementation of the Cozen card game.

## Structure

- `CozenGame.ts` - Main game definition with moves, phases, and setup
- `types/index.ts` - TypeScript interfaces for game state
- `utils/` - Utility functions for card and board management
- `ai/` - AI implementation
- `components/` - React components for the game board
- `CozenClient.tsx` - Client implementation for different scenarios
- `server.ts` - Server implementation for multiplayer

## Getting Started

### Running the Test Client

To test the implementation in console mode:

```typescript
import { client, makeMove, printBoard } from './TestClient';

// Example: Make a stake move
makeMove('black', 'stakeCard', 'black-spades-10');

// Example: Make a wager move
makeMove('red', 'wagerCards', ['red-hearts-5', 'red-diamonds-5'], 4);

// Print the current board state
printBoard(client.getState().G);
```

### Running the React Client

To run the game with the React UI:

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { LocalGameComponent, AIGameComponent } from './CozenClient';

// For local play (two players sharing the screen)
ReactDOM.render(<LocalGameComponent />, document.getElementById('root'));

// Or play against AI
ReactDOM.render(<AIGameComponent />, document.getElementById('root'));
```

### Running the Server

To run the multiplayer server:

```typescript
import './server';
```

Then connect with the client:

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { OnlineGameComponent } from './CozenClient';

ReactDOM.render(
  <OnlineGameComponent 
    matchID="my-game" 
    playerID="red" 
    serverURI="http://localhost:8000" 
  />, 
  document.getElementById('root')
);
```

## How It Works

### Game State

The game state is defined in `types/index.ts` and includes:

- Player information (hands, decks, jail, victory points)
- Board with columns and positions
- Round state tracking
- Active player tracking

### Game Flow

1. Game setup creates initial state with shuffled decks and first stakes
2. Players alternate turns, either staking a card or wagering cards
3. When a player runs out of cards, the game enters "last_play" state
4. When the last player plays their final card, the round ends
5. Contested columns are resolved, and cards may go to jail
6. A new round begins unless a player has reached 70 victory points

### AI Implementation

The AI uses boardgame.io's built-in MCTS (Monte Carlo Tree Search) bot with:

- Custom move enumeration in `ai/enumerate.ts`
- Evaluation based on card combination strength
- Decision making that considers both immediate gains and future potential

## Next Steps

- Refine the UI for better user experience
- Add animations for card movements
- Implement spectator mode
- Add game replays and history
- Create a lobby system for matchmaking