# Integrating Cozen's Minimax AI with boardgame.io

This document outlines how to integrate Cozen's existing minimax algorithm with boardgame.io's AI framework.

## Overview of boardgame.io's AI Architecture

boardgame.io has a flexible AI framework that follows these key principles:

1. **Bot Base Class**: All AI implementations extend from the `Bot` abstract class
2. **Move Enumeration**: Games must provide an `enumerate` function that returns all valid moves for a given state
3. **State Evaluation**: AI can use objectives or custom evaluation functions to assess positions
4. **Simulation**: The framework includes state simulation for lookahead

## Implementing a MinimaxBot for Cozen

### 1. Create a Custom MinimaxBot Class

```typescript
// src/boardgame/ai/minimaxBot.ts
import { Bot } from 'boardgame.io/ai';
import type { Ctx, State, PlayerID } from 'boardgame.io';
import type { BotAction } from 'boardgame.io/ai';
import { CreateGameReducer } from 'boardgame.io/core';
import { CozenGame } from '../CozenGame';
import { CozenState } from '../types';

export class MinimaxBot extends Bot {
  private reducer: any;
  private evaluationFn: (G: CozenState, ctx: Ctx, playerID: PlayerID) => number;
  private maxDepth: number;

  constructor({
    enumerate,
    seed,
    game,
    maxDepth = 3,
    evaluationFn,
  }: {
    enumerate: any;
    seed?: string | number;
    game: any;
    maxDepth?: number;
    evaluationFn: (G: CozenState, ctx: Ctx, playerID: PlayerID) => number;
  }) {
    super({ enumerate, seed });
    this.reducer = CreateGameReducer({ game });
    this.maxDepth = maxDepth;
    this.evaluationFn = evaluationFn;

    // Add customizable options
    this.addOpt({
      key: 'maxDepth',
      initial: maxDepth,
      range: { min: 1, max: 5 },
    });
  }

  async play(state: State, playerID: PlayerID): Promise<{ action: BotAction; metadata?: any }> {
    const depth = this.getOpt('maxDepth');
    const { action, score } = this.minimax(state, playerID, depth, true);

    return Promise.resolve({
      action,
      metadata: { score, depth, evaluations: this.iterationCounter },
    });
  }

  // The minimax algorithm implementation
  minimax(
    state: State,
    playerID: PlayerID,
    depth: number,
    maximizingPlayer: boolean,
    alpha: number = -Infinity,
    beta: number = Infinity
  ): { action: BotAction | null; score: number } {
    this.iterationCounter++;

    // Terminal conditions
    if (depth === 0 || state.ctx.gameover !== undefined) {
      const score = this.evaluationFn(state.G, state.ctx, playerID);
      return { action: null, score };
    }

    const moves = this.enumerate(state.G, state.ctx, playerID);

    // No valid moves
    if (moves.length === 0) {
      return { action: null, score: this.evaluationFn(state.G, state.ctx, playerID) };
    }

    if (maximizingPlayer) {
      let bestScore = -Infinity;
      let bestAction = null;

      for (const action of moves) {
        // Apply the move
        const newState = this.reducer(state, action);
        // Get next player (can be different in different game phases)
        const nextPlayerID = this.getNextPlayer(newState, playerID);
        // Recursive minimax call
        const { score } = this.minimax(
          newState,
          nextPlayerID,
          depth - 1,
          nextPlayerID === playerID,
          alpha,
          beta
        );

        if (score > bestScore) {
          bestScore = score;
          bestAction = action;
        }

        // Alpha-beta pruning
        alpha = Math.max(alpha, bestScore);
        if (beta <= alpha) break;
      }

      return { action: bestAction, score: bestScore };
    } else {
      let bestScore = Infinity;
      let bestAction = null;

      for (const action of moves) {
        // Apply the move
        const newState = this.reducer(state, action);
        // Get next player
        const nextPlayerID = this.getNextPlayer(newState, playerID);
        // Recursive minimax call
        const { score } = this.minimax(
          newState,
          nextPlayerID,
          depth - 1,
          nextPlayerID === playerID,
          alpha,
          beta
        );

        if (score < bestScore) {
          bestScore = score;
          bestAction = action;
        }

        // Alpha-beta pruning
        beta = Math.min(beta, bestScore);
        if (beta <= alpha) break;
      }

      return { action: bestAction, score: bestScore };
    }
  }

  // Helper to get the next player from the state
  private getNextPlayer(state: State, currentPlayerID: PlayerID): PlayerID {
    if (state.ctx.activePlayers) {
      return Object.keys(state.ctx.activePlayers)[0] as PlayerID;
    }
    return state.ctx.currentPlayer;
  }
}
```

### 2. Create Evaluation Functions

Adapt Cozen's existing evaluation functions:

```typescript
// src/boardgame/ai/evaluationFunctions.ts
import type { Ctx, PlayerID } from 'boardgame.io';
import { CozenState } from '../types';
import { Color } from '../../types/game';

export function evaluateState(G: CozenState, ctx: Ctx, playerID: PlayerID): number {
  const player = G.players[playerID as 'red' | 'black'];
  const opponent = G.players[playerID === 'red' ? 'black' : 'red'];

  // Basic evaluation - victory points difference
  let score = player.victory_points - opponent.victory_points;

  // Evaluate hand strength
  score += evaluateHandStrength(player.hand) * 0.5;
  score -= evaluateHandStrength(opponent.hand) * 0.5;

  // Evaluate board position
  score += evaluateBoardPosition(G, playerID as 'red' | 'black');

  // Evaluate stakes ownership
  score += evaluateStakes(G, playerID as 'red' | 'black');

  return score;
}

// Evaluate hand strength based on pairs and straights potential
function evaluateHandStrength(hand) {
  // Use existing CardEvaluation from Cozen
  // Implementation adapted from Cozen's CardEvaluation service
  let strength = 0;
  
  // Check for pairs
  const cardValues = hand.map(card => card.number);
  const valueCounts = {};
  
  cardValues.forEach(value => {
    valueCounts[value] = (valueCounts[value] || 0) + 1;
  });
  
  // Score pairs
  Object.values(valueCounts).forEach(count => {
    if (count >= 2) {
      strength += 3; // Pair value
    }
  });
  
  // Score straights potential
  // Simplified version of straight detection
  const uniqueValues = Array.from(new Set(cardValues)).sort((a, b) => a - b);
  let longestStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < uniqueValues.length; i++) {
    if (uniqueValues[i] === uniqueValues[i-1] + 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  
  if (longestStreak >= 2) {
    strength += longestStreak;
  }
  
  return strength;
}

// Evaluate board position
function evaluateBoardPosition(G: CozenState, playerID: 'red' | 'black'): number {
  let score = 0;
  
  // Check contested columns
  G.board.forEach(column => {
    if (!column.stakedCard) return;
    
    // Count player's cards in each column
    const playerCardCount = column.positions.filter(pos => 
      pos.card && (pos.card.color === Color.Red && playerID === 'red' || 
                  pos.card.color === Color.Black && playerID === 'black')
    ).length;
    
    // Count opponent's cards in each column
    const opponentCardCount = column.positions.filter(pos => 
      pos.card && (pos.card.color === Color.Red && playerID === 'black' || 
                  pos.card.color === Color.Black && playerID === 'red')
    ).length;
    
    // If column is contested, evaluate the relative position
    if (playerCardCount > 0 && opponentCardCount > 0) {
      // Check if stake is owned by player
      const stakeIsOwned = column.stakedCard.color === Color.Red && playerID === 'red' || 
                          column.stakedCard.color === Color.Black && playerID === 'black';
      
      // Evaluate position in this column
      const columnScore = evaluateColumnStrength(
        column, 
        playerID, 
        stakeIsOwned
      );
      
      score += columnScore;
    }
  });
  
  return score;
}

// Evaluate contested column strength
function evaluateColumnStrength(column, playerID, stakeIsOwned) {
  // Implementation similar to Cozen's column strength evaluation
  // This would be based on the relative strength of hands in the column
  return 0; // Simplified placeholder
}

// Evaluate stakes ownership
function evaluateStakes(G: CozenState, playerID: 'red' | 'black'): number {
  let score = 0;
  
  // Count stakes owned by player
  const playerStakes = G.board.filter(column => 
    column.stakedCard && 
    (column.stakedCard.color === Color.Red && playerID === 'red' || 
     column.stakedCard.color === Color.Black && playerID === 'black')
  ).length;
  
  // Count stakes owned by opponent
  const opponentStakes = G.board.filter(column => 
    column.stakedCard && 
    (column.stakedCard.color === Color.Red && playerID === 'black' || 
     column.stakedCard.color === Color.Black && playerID === 'red')
  ).length;
  
  // Advantage for having more stakes
  score += (playerStakes - opponentStakes) * 2;
  
  return score;
}
```

### 3. Implement the Enumerate Function in the Game Definition

```typescript
// src/boardgame/CozenGame.ts
import { Game } from 'boardgame.io';
import { CozenState } from './types';
import { setupInitialState } from './setup';
import { moves } from './moves';

export const CozenGame: Game<CozenState> = {
  name: 'cozen',
  
  setup: setupInitialState,
  
  moves: moves,
  
  // ... other game configuration
  
  // Add AI move enumeration
  ai: {
    enumerate: (G: CozenState, ctx: any, playerID: string) => {
      const player = G.players[playerID as 'red' | 'black'];
      const moves = [];
      
      // Check if it's this player's turn
      if (G.activePlayer !== playerID) return [];
      
      // If in running state, allow staking or wagering
      if (G.roundState === 'running' || G.roundState === 'last_play') {
        // Option 1: Stake a card
        if (player.hand.length > 0 && player.availableStakes.length > 0) {
          player.hand.forEach(card => {
            player.availableStakes.forEach(column => {
              moves.push({
                move: 'stakeCard',
                args: [card.id, column]
              });
            });
          });
        }
        
        // Option 2: Wager cards
        // Get all possible combinations of cards to wager
        if (player.hand.length > 0) {
          const cardCombinations = generateCardCombinations(player.hand);
          
          // For each combination, try each column with a stake
          cardCombinations.forEach(cards => {
            G.board.forEach((column, index) => {
              if (column.stakedCard) {
                moves.push({
                  move: 'wagerCards',
                  args: [cards.map(c => c.id), index]
                });
              }
            });
          });
        }
      }
      
      return moves;
    }
  }
};

// Helper function to generate all possible combinations of cards from a hand
function generateCardCombinations(hand) {
  const result = [];
  
  // Single cards
  hand.forEach(card => {
    result.push([card]);
  });
  
  // Pairs (only if they have the same number - most valuable play)
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      if (hand[i].number === hand[j].number) {
        result.push([hand[i], hand[j]]);
      }
    }
  }
  
  // Straights (cards in sequence)
  // This is a simplified implementation
  const sortedHand = [...hand].sort((a, b) => a.number - b.number);
  for (let length = 2; length <= Math.min(5, sortedHand.length); length++) {
    for (let i = 0; i <= sortedHand.length - length; i++) {
      const potentialStraight = sortedHand.slice(i, i + length);
      let isStraight = true;
      
      for (let j = 1; j < potentialStraight.length; j++) {
        if (potentialStraight[j].number !== potentialStraight[j-1].number + 1) {
          isStraight = false;
          break;
        }
      }
      
      if (isStraight) {
        result.push(potentialStraight);
      }
    }
  }
  
  // Other combinations - can be expanded based on game rules
  
  return result;
}
```

### 4. Implementing Visualization for the AI Decision Tree

```typescript
// src/boardgame/ai/minimaxVisualizer.ts
import type { Ctx, State, PlayerID } from 'boardgame.io';
import type { BotAction } from 'boardgame.io/ai';
import { CreateGameReducer } from 'boardgame.io/core';

interface TreeNode {
  state: State;
  action?: BotAction;
  score?: number;
  depth: number;
  children: TreeNode[];
  playerID: PlayerID;
  isMaximizing: boolean;
}

export class MinimaxVisualizer {
  private reducer: any;
  private evaluationFn: (G: any, ctx: Ctx, playerID: PlayerID) => number;
  private enumerate: (G: any, ctx: Ctx, playerID: PlayerID) => BotAction[];
  private tree: TreeNode | null = null;

  constructor({
    game,
    evaluationFn,
    enumerate,
  }) {
    this.reducer = CreateGameReducer({ game });
    this.evaluationFn = evaluationFn;
    this.enumerate = enumerate;
  }

  // Build the decision tree for visualization
  buildTree(
    state: State,
    playerID: PlayerID,
    maxDepth: number
  ): TreeNode {
    const root: TreeNode = {
      state,
      depth: 0,
      children: [],
      playerID,
      isMaximizing: true,
    };

    this.expandNode(root, maxDepth);
    this.tree = root;
    return root;
  }

  // Recursively expand nodes in the tree
  private expandNode(node: TreeNode, maxDepth: number): number {
    // Terminal conditions
    if (node.depth >= maxDepth || node.state.ctx.gameover !== undefined) {
      node.score = this.evaluationFn(node.state.G, node.state.ctx, node.playerID);
      return node.score;
    }

    const playerID = this.getPlayerID(node.state, node.playerID);
    const moves = this.enumerate(node.state.G, node.state.ctx, playerID);

    // No valid moves
    if (moves.length === 0) {
      node.score = this.evaluationFn(node.state.G, node.state.ctx, node.playerID);
      return node.score;
    }

    // For each possible move, create a child node
    const scores: number[] = [];
    for (const action of moves) {
      const newState = this.reducer(node.state, action);
      const nextPlayerID = this.getPlayerID(newState, node.playerID);
      const isMaximizing = nextPlayerID === node.playerID;

      const childNode: TreeNode = {
        state: newState,
        action,
        depth: node.depth + 1,
        children: [],
        playerID: nextPlayerID,
        isMaximizing,
      };

      node.children.push(childNode);
      const score = this.expandNode(childNode, maxDepth);
      scores.push(score);
    }

    // Calculate node score based on children
    node.score = node.isMaximizing
      ? Math.max(...scores)
      : Math.min(...scores);

    return node.score;
  }

  // Get the current player from the state
  private getPlayerID(state: State, originalPlayerID: PlayerID): PlayerID {
    if (state.ctx.activePlayers) {
      return Object.keys(state.ctx.activePlayers)[0] as PlayerID;
    }
    return state.ctx.currentPlayer;
  }

  // Render the tree to a visual format
  renderTree(): string {
    if (!this.tree) return "Tree not built yet";
    
    // Convert tree to DOT format for Graphviz
    let dot = "digraph MinimaxTree {\n";
    dot += "  node [shape=box];\n";
    
    // Add nodes and edges recursively
    this.addNodesToDot(this.tree, 0, dot);
    
    dot += "}";
    return dot;
  }
  
  private addNodesToDot(node: TreeNode, id: number, dotString: string): number {
    // Create a label for this node
    const score = node.score !== undefined ? `, Score: ${node.score.toFixed(2)}` : '';
    const player = `Player: ${node.playerID}`;
    const depth = `Depth: ${node.depth}`;
    const type = node.isMaximizing ? "MAX" : "MIN";
    
    dotString += `  node${id} [label="${type}\\n${player}\\n${depth}${score}"];\n`;
    
    let nextId = id + 1;
    for (const child of node.children) {
      // Create edge with move description
      const moveDesc = child.action ? `Move: ${JSON.stringify(child.action.payload)}` : "Initial";
      dotString += `  node${id} -> node${nextId} [label="${moveDesc}"];\n`;
      
      // Recursively add child nodes
      nextId = this.addNodesToDot(child, nextId, dotString);
    }
    
    return nextId;
  }
}
```

### 5. Using the MinimaxBot in a Client Application

```typescript
// src/client/CozenClient.tsx
import React, { useState } from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { Step } from 'boardgame.io/ai';
import { CozenGame } from '../boardgame/CozenGame';
import { CozenBoard } from './CozenBoard';
import { MinimaxBot } from '../boardgame/ai/minimaxBot';
import { evaluateState } from '../boardgame/ai/evaluationFunctions';

// AI difficulty levels
const AI_LEVELS = {
  easy: {
    maxDepth: 1,
  },
  medium: {
    maxDepth: 2,
  },
  hard: {
    maxDepth: 3,
  },
  expert: {
    maxDepth: 4,
  }
};

// AI controls component
const AIControls = ({ playerID, matchID, difficulty, onChangeDifficulty }) => {
  // Create minimax bot with appropriate settings
  const createBot = () => {
    return new MinimaxBot({
      game: CozenGame,
      enumerate: CozenGame.ai.enumerate,
      maxDepth: AI_LEVELS[difficulty].maxDepth,
      evaluationFn: evaluateState,
    });
  };

  return (
    <div className="ai-controls">
      <h3>AI Difficulty</h3>
      <div className="difficulty-buttons">
        {Object.keys(AI_LEVELS).map(level => (
          <button
            key={level}
            onClick={() => onChangeDifficulty(level)}
            className={difficulty === level ? 'active' : ''}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

// Main game component
const CozenClient = () => {
  const [difficulty, setDifficulty] = useState('medium');
  const [aiPlayerID, setAIPlayerID] = useState('black');
  const [humanPlayerID, setHumanPlayerID] = useState('red');

  // Create boardgame.io client with AI
  const CozenClientWithAI = Client({
    game: CozenGame,
    board: CozenBoard,
    debug: true,
    multiplayer: Local({
      bots: {
        [aiPlayerID]: {
          bot: MinimaxBot,
          opts: {
            maxDepth: AI_LEVELS[difficulty].maxDepth,
            evaluationFn: evaluateState,
          }
        }
      }
    }),
  });

  return (
    <div className="cozen-client">
      <h1>Cozen</h1>
      <div className="game-container">
        <CozenClientWithAI playerID={humanPlayerID} />
        <AIControls 
          playerID={aiPlayerID}
          matchID="default"
          difficulty={difficulty}
          onChangeDifficulty={setDifficulty}
        />
      </div>
    </div>
  );
};

export default CozenClient;
```

## Adapting Existing Cozen Minimax Implementation

The existing Cozen minimax visualization code can be adapted as follows:

1. **Extract Core Algorithm**: 
   - Extract the existing minimax implementation from Cozen's visualization tools
   - Modify it to work with boardgame.io's state and actions

2. **Adapt Evaluation Functions**:
   - Convert Cozen's board evaluation to work with the new state structure
   - Ensure it handles both players' perspectives correctly

3. **Visualizer Integration**:
   - Adapt the existing visualization to work with boardgame.io's tree structure
   - Use the same visualization approach but with the new state format

## Conclusion

boardgame.io provides a flexible AI framework that can be extended with custom bot implementations. The MinimaxBot implementation outlined above allows for:

1. Seamless integration with boardgame.io's client and server architecture
2. Reuse of Cozen's existing evaluation functions and strategies
3. Customizable difficulty levels through search depth adjustments
4. Visualization of the decision tree for debugging and demonstration

The migration should focus on:
1. Properly implementing the `enumerate` function to generate all valid moves
2. Converting the existing evaluation function to work with the new state structure
3. Implementing the MinimaxBot class with appropriate alpha-beta pruning for efficiency

This approach allows for incremental development, where you can first implement a simple random bot, then add the minimax implementation, and finally optimize and visualize the AI's decision-making process.