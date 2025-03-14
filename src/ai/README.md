# Cozen AI System

This directory contains AI implementation for the Cozen card game, using boardgame.io's built-in Monte Carlo Tree Search (MCTS) bot.

## Architecture

The AI system consists of:

1. **Move generation** (`enumerate.ts`): Generates all possible legal moves
2. **Game evaluation** (`aiUtils.ts`): Evaluates game states
3. **Integration with boardgame.io** (`CozenGame.ts`): Connects our AI with the boardgame.io framework

## How It Works

### Monte Carlo Tree Search (MCTS)

The boardgame.io MCTS implementation:

1. Builds a tree of possible game states via simulation
2. Balances exploration and exploitation using UCB1 formula
3. Uses our custom evaluation function to score leaf nodes
4. Selects the move with the highest probability of success

### Game State Evaluation

The evaluation function (`mctsObjective` in `aiUtils.ts`):

1. Considers victory point differences between players
2. Evaluates hand strength (pairs, straights, etc.)
3. Factors in captured cards and position advantages
4. Returns a normalized score between 0 and 1

## Configuring the AI

To adjust the AI difficulty, you can configure the MCTS bot with different parameters:

```typescript
// Example of configuring the MCTS bot in a client
const client = Client({
  game: CozenGame,
  numPlayers: 2,
  playerID: '0',  // Player is Red (0)
  debug: false,
  bots: {
    '1': {  // Bot is Black (1)
      bot: MCTSBot,
      enumerate: CozenGame.ai.enumerate,
      objectives: {
        '1': aiUtils.mctsObjective
      },
      iterations: 1000,  // Higher = stronger AI but slower
      playoutDepth: 50   // How far to simulate games
    }
  }
});
```

Adjust the following parameters to change difficulty:
- `iterations`: Number of simulations (higher = stronger but slower)
- `playoutDepth`: How far to look ahead (higher = more accurate but slower)

## Troubleshooting

If the AI is:

- **Too slow**: Reduce iterations or playoutDepth
- **Making poor moves**: Increase iterations or check the evaluation function
- **Not working**: Ensure the enumerate function is generating all legal moves

## Debugging AI Decisions

To understand why the AI made a specific move:

1. Enable `debug: true` in the client configuration
2. Call `showAILogs()` in the CozenGame module
3. Check the console to see simulation statistics