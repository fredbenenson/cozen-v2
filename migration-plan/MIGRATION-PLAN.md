# Cozen to boardgame.io Migration Plan

This document outlines a step-by-step plan for migrating the Cozen card game from its current custom implementation to the boardgame.io framework.

## Overview

boardgame.io is a framework for turn-based games that provides:
- State management with immutable updates
- Move validation and flow control
- Built-in multiplayer server
- Automatic state synchronization
- Ability to handle secret information

The migration will preserve all game logic while refactoring the state management and move handling to use boardgame.io's architecture.

## Phase 1: Dependencies and Setup

1. Install dependencies:
   ```bash
   npm install boardgame.io socket.io socket.io-client
   ```

2. Create initial boardgame.io game definition:
   ```typescript
   // src/boardgame/CozenGame.ts
   import { Game } from 'boardgame.io';
   import { INVALID_MOVE } from 'boardgame.io/core';
   import { CozenState } from './types';
   import { setupInitialState } from './setup';
   import { moves } from './moves';
   
   export const CozenGame: Game<CozenState> = {
     name: 'cozen',
     
     setup: setupInitialState,
     
     moves: moves,
     
     turn: {
       minMoves: 1,
       maxMoves: 1,
     },
     
     endIf: (G, ctx) => {
       // Win condition: player has 70+ victory points
       if (G.players.red.victory_points >= 70) {
         return { winner: 'red' };
       }
       if (G.players.black.victory_points >= 70) {
         return { winner: 'black' };
       }
       return false;
     },
   };
   ```

## Phase 2: State Structure

1. Create boardgame.io state types:
   ```typescript
   // src/boardgame/types.ts
   import { Card, Color, Suit, Column } from '../types/game';
   import { Round } from '../types/round';
   
   export interface CozenPlayer {
     id: string;
     color: Color;
     hand: Card[];
     jail: Card[];
     cards: Card[];
     victory_points: number;
     availableStakes: number[];
   }
   
   export interface CozenState {
     players: {
       red: CozenPlayer;
       black: CozenPlayer;
     };
     round: Round | null;
     board: Column[];
     firstStakes: {
       red: Card[];
       black: Card[];
     };
     isFirstRound: boolean;
     cardsJailed: number;
   }
   ```

2. Create setup function to initialize game state:
   ```typescript
   // src/boardgame/setup.ts
   import { CozenState } from './types';
   import { DeckService } from '../services/deckService';
   import { Color } from '../types/game';
   
   export function setupInitialState(): CozenState {
     // Create initial decks for players
     const redDeck = DeckService.createDeck(Color.Red);
     const blackDeck = DeckService.createDeck(Color.Black);
     
     // Initialize red player
     const redPlayer = {
       id: 'red',
       color: Color.Red,
       hand: redDeck.slice(0, 5),
       jail: [],
       cards: redDeck.slice(5),
       victory_points: 0,
       availableStakes: [5, 6, 7, 8, 9],
     };
     
     // Initialize black player
     const blackPlayer = {
       id: 'black',
       color: Color.Black,
       hand: blackDeck.slice(0, 5),
       jail: [],
       cards: blackDeck.slice(5),
       victory_points: 0,
       availableStakes: [0, 1, 2, 3, 4],
     };
     
     // Initialize first stakes
     const redStake = redPlayer.cards.shift();
     const blackStake = blackPlayer.cards.shift();
     
     return {
       players: {
         red: redPlayer,
         black: blackPlayer,
       },
       round: null,
       board: [],
       firstStakes: {
         red: redStake ? [redStake] : [],
         black: blackStake ? [blackStake] : [],
       },
       isFirstRound: true,
       cardsJailed: 0,
     };
   }
   ```

## Phase 3: Game Moves

1. Define core moves:
   ```typescript
   // src/boardgame/moves.ts
   import { INVALID_MOVE } from 'boardgame.io/core';
   import { CozenState } from './types';
   import { Card, Color } from '../types/game';
   import { CardEvaluation } from '../services/cardEvaluation';
   import { StakeService } from '../services/stakeService';
   
   export const moves = {
     // Stake move - place a card in the stakes row
     stakeCard: {
       move: (G: CozenState, ctx: any, cardId: string, column?: number) => {
         const player = G.players[ctx.currentPlayer as 'red' | 'black'];
         const cardIndex = player.hand.findIndex(c => c.id === cardId);
         
         if (cardIndex === -1) return INVALID_MOVE;
         
         // Get the card and remove from hand
         const card = player.hand[cardIndex];
         player.hand.splice(cardIndex, 1);
         
         // Place stake in appropriate column
         const stakeColumn = column ?? StakeService.getNextValidStakeColumn(player, G);
         if (stakeColumn === undefined) return INVALID_MOVE;
         
         // Place stake in column
         G.board[stakeColumn].stakedCard = card;
         
         // Draw up a new card if not in last_play state
         if (G.round?.state !== 'last_play' && player.cards.length > 0) {
           player.hand.push(player.cards.shift()!);
         }
         
         return G;
       },
       client: false,
     },
     
     // Wager move - place cards in a column
     wagerCards: {
       move: (G: CozenState, ctx: any, cardIds: string[], column: number) => {
         const player = G.players[ctx.currentPlayer as 'red' | 'black'];
         
         // Find cards in hand
         const cardsToPlay: Card[] = [];
         const newHand: Card[] = [...player.hand];
         
         for (const cardId of cardIds) {
           const index = newHand.findIndex(c => c.id === cardId);
           if (index !== -1) {
             cardsToPlay.push(newHand[index]);
             newHand.splice(index, 1);
           }
         }
         
         if (cardsToPlay.length === 0) return INVALID_MOVE;
         
         // Update player's hand
         player.hand = newHand;
         
         // Place cards in specified column
         // ... (implementation similar to RoundService.placeWageredCards)
         
         return G;
       },
       client: false,
     },
     
     // End round and calculate scores
     endRound: {
       move: (G: CozenState, ctx: any) => {
         if (!G.round || G.round.state !== 'complete') return INVALID_MOVE;
         
         // Score the board and resolve contested columns
         // ... (implementation similar to RoundService.scoreBoard)
         
         // Prepare for the next round
         // ... (implementation similar to GameService.setupNextRound)
         
         return G;
       },
       client: false,
     },
   };
   ```

## Phase 4: Game Phases and Turn Order

1. Define game phases:
   ```typescript
   // Update CozenGame.ts with phases
   const CozenGame: Game<CozenState> = {
     // ...existing properties
     
     phases: {
       // Initial phase with stakes placed
       play: {
         start: true,
         turn: {
           order: {
             // Determine first player based on stakes
             first: (G, ctx) => {
               return G.round?.activePlayer.color === Color.Red ? 0 : 1;
             },
             next: (G, ctx) => (ctx.playOrderPos + 1) % ctx.numPlayers,
           },
           stages: {
             stake: {
               moves: { stakeCard },
             },
             wager: {
               moves: { wagerCards },
             },
           },
           onBegin: (G, ctx) => {
             // Check if any player has an empty hand
             const currentPlayer = G.players[ctx.currentPlayer as 'red' | 'black'];
             const otherPlayer = G.players[ctx.currentPlayer === 'red' ? 'black' : 'red'];
             
             if (otherPlayer.hand.length === 0 && G.round?.state !== 'last_play') {
               G.round!.state = 'last_play';
             }
             
             return G;
           },
           onEnd: (G, ctx) => {
             // Check if round is over
             const currentPlayer = G.players[ctx.currentPlayer as 'red' | 'black'];
             if (currentPlayer.hand.length === 0 && G.round?.state === 'last_play') {
               G.round!.state = 'complete';
               ctx.events?.endPhase();
             }
             
             return G;
           },
         },
       },
       
       // Round end phase for scoring
       roundEnd: {
         onBegin: (G, ctx) => {
           // Score the board
           // ... scoring logic similar to RoundService.scoreBoard
           return G;
         },
         onEnd: (G, ctx) => {
           // Prepare for next round
           // ... logic similar to GameService.setupNextRound
           return G;
         },
         endIf: (G, ctx) => {
           // End phase after scoring
           return true;
         },
         next: 'play',
       },
     },
   };
   ```

## Phase 5: Game Logic Port

1. Adapt existing services to work with boardgame.io:
   - Create utility functions to handle card evaluation
   - Create functions for scoring and resolution
   - Port round initialization logic

2. Example of porting the scoring logic:
   ```typescript
   // src/boardgame/scoring.ts
   import { CozenState } from './types';
   import { Card, Color } from '../types/game';
   import { CardEvaluation } from '../services/cardEvaluation';
   
   export function scoreBoard(G: CozenState): void {
     // Reset victory points for this round
     const roundVictoryPoints = { red: 0, black: 0 };
     
     // Iterate through all columns with stake cards
     G.board.forEach(column => {
       if (!column.stakedCard) return;
       
       // Check if the column is contested
       if (isColumnContested(column, G)) {
         resolveContestedColumn(column, G, roundVictoryPoints);
       } else {
         returnUncontestedCards(column, G);
       }
     });
     
     // Update player victory points
     G.players.red.victory_points += roundVictoryPoints.red;
     G.players.black.victory_points += roundVictoryPoints.black;
   }
   
   // ... implement supporting functions for scoring, etc.
   ```

## Phase 6: Server Implementation

1. Create a boardgame.io server:
   ```typescript
   // src/server.ts
   import { Server } from 'boardgame.io/server';
   import { CozenGame } from './boardgame/CozenGame';
   import path from 'path';
   import serve from 'koa-static';
   import { Db } from 'mongodb';
   
   // Create a boardgame.io server
   const server = Server({
     games: [CozenGame],
     // Add your authentication configuration here if needed
   });
   
   // Serve static files
   const PORT = parseInt(process.env.PORT || '8000');
   const frontendPath = path.resolve(__dirname, '../build');
   server.app.use(serve(frontendPath));
   
   server.run(PORT, () => {
     console.log(`Cozen server running on port ${PORT}`);
   });
   ```

## Phase 7: Client Integration

1. Create a basic client:
   ```typescript
   // src/client/CozenClient.tsx
   import { Client } from 'boardgame.io/react';
   import { SocketIO } from 'boardgame.io/multiplayer';
   import { CozenGame } from '../boardgame/CozenGame';
   import { CozenBoard } from './CozenBoard';
   
   const CozenClient = Client({
     game: CozenGame,
     board: CozenBoard,
     multiplayer: SocketIO({ server: window.location.origin }),
     debug: false,
   });
   
   export default CozenClient;
   ```

2. Create a React board component to display the game:
   ```typescript
   // src/client/CozenBoard.tsx
   import React from 'react';
   import { BoardProps } from 'boardgame.io/react';
   import { CozenState } from '../boardgame/types';
   
   export function CozenBoard({ G, ctx, moves }: BoardProps<CozenState>) {
     // Get the current player
     const playerColor = ctx.currentPlayer as 'red' | 'black';
     const player = G.players[playerColor];
     
     // Define handlers for staking and wagering
     const handleStakeCard = (cardId: string) => {
       moves.stakeCard(cardId);
     };
     
     const handleWagerCards = (cardIds: string[], column: number) => {
       moves.wagerCards(cardIds, column);
     };
     
     // Render the game board
     return (
       <div className="cozen-board">
         {/* Render opponent cards */}
         <div className="opponent">
           <div className="hand">
             {G.players[playerColor === 'red' ? 'black' : 'red'].hand.map(card => (
               <div key={card.id} className="card card-back" />
             ))}
           </div>
         </div>
         
         {/* Render board and stake columns */}
         <div className="board">
           {G.board.map((column, index) => (
             <div key={index} className="column" onClick={() => handleWagerCards([], index)}>
               {column.stakedCard && (
                 <div className={`card stake-card ${column.stakedCard.color}`}>
                   {column.stakedCard.number}
                 </div>
               )}
               {/* Render cards in column */}
             </div>
           ))}
         </div>
         
         {/* Render player's hand */}
         <div className="player-hand">
           {player.hand.map(card => (
             <div
               key={card.id}
               className={`card ${card.color}`}
               onClick={() => handleStakeCard(card.id)}
             >
               {card.number}
             </div>
           ))}
         </div>
       </div>
     );
   }
   ```

## Phase 8: API Integration

1. Create API endpoints to interact with boardgame.io lobbies:
   ```typescript
   // src/routes/gameRoutes.ts
   import express from 'express';
   import { LobbyClient } from 'boardgame.io/client';
   
   const router = express.Router();
   const lobbyClient = new LobbyClient({ server: 'http://localhost:8000' });
   
   // Create a new game
   router.post('/create', async (req, res) => {
     try {
       const { gameName, numPlayers } = req.body;
       const { matchID } = await lobbyClient.createMatch('cozen', {
         numPlayers: 2,
       });
       
       res.json({ matchID });
     } catch (error) {
       res.status(500).json({ error: 'Failed to create game' });
     }
   });
   
   // Join a game
   router.post('/:matchID/join', async (req, res) => {
     try {
       const { matchID } = req.params;
       const { playerID, playerName } = req.body;
       
       await lobbyClient.joinMatch('cozen', matchID, {
         playerID,
         playerName,
       });
       
       res.json({ success: true });
     } catch (error) {
       res.status(500).json({ error: 'Failed to join game' });
     }
   });
   
   export default router;
   ```

## Phase 9: MongoDB Storage Adapter

1. Create a MongoDB storage adapter for boardgame.io:
   ```typescript
   // src/storage/MongoStorage.ts
   import { Async } from 'boardgame.io/internal';
   import { StorageAPI } from 'boardgame.io/dist/types/src/server/db/base';
   import { State, Server, LogEntry } from 'boardgame.io';
   import { MongoClient, Db, Collection } from 'mongodb';
   
   export class MongoStorage implements StorageAPI {
     private db: Db;
     private games: Collection;
     
     constructor(mongoClient: MongoClient, dbName: string) {
       this.db = mongoClient.db(dbName);
       this.games = this.db.collection('games');
     }
     
     async connect() {
       // Connection already established via constructor
       return;
     }
     
     async createGame(gameID: string, opts: Server.CreateGameOpts) {
       const { initialState, metadata } = opts;
       
       await this.games.insertOne({
         gameID,
         state: initialState,
         metadata,
         logs: [],
       });
     }
     
     async fetch<T>(gameID: string): Promise<State<T>> {
       const game = await this.games.findOne({ gameID });
       
       if (!game) {
         throw new Error(`Game ${gameID} not found`);
       }
       
       return game.state;
     }
     
     async setState<T>(gameID: string, state: State<T>) {
       await this.games.updateOne(
         { gameID },
         { $set: { state } }
       );
     }
     
     async wipe(gameID: string) {
       await this.games.deleteOne({ gameID });
     }
     
     async listGames() {
       const games = await this.games.find({}).toArray();
       return games.map(g => g.gameID);
     }
     
     // Implement other required methods
   }
   ```

## Phase 10: Testing Approach

1. Create tests for the boardgame.io implementation:
   ```typescript
   // src/tests/boardgame.test.ts
   import { Client } from 'boardgame.io/client';
   import { CozenGame } from '../boardgame/CozenGame';
   
   describe('Cozen boardgame.io implementation', () => {
     // Test initial setup
     test('game setup initializes properly', () => {
       const client = Client({
         game: CozenGame,
       });
       
       const { G, ctx } = client.getState();
       
       expect(G.players.red).toBeDefined();
       expect(G.players.black).toBeDefined();
       expect(G.players.red.hand).toHaveLength(5);
       expect(G.players.black.hand).toHaveLength(5);
       // Add more assertions...
     });
     
     // Test staking a card
     test('staking a card works correctly', () => {
       const client = Client({
         game: CozenGame,
       });
       
       const { G: initialG } = client.getState();
       const cardId = initialG.players.red.hand[0].id;
       
       client.moves.stakeCard(cardId);
       
       const { G } = client.getState();
       expect(G.players.red.hand).toHaveLength(5);  // Should draw a new card
       // Add more assertions...
     });
     
     // Additional tests for game logic...
   });
   ```

## Phase 11: Migration Strategy

1. **Incremental Migration Approach**:
   - Keep existing implementation as a reference
   - Begin with a parallel implementation of boardgame.io
   - Initially, focus on core gameplay without UI/multiplayer
   - Add server, multiplayer, and UI components
   - Run both versions side-by-side for testing
   - Switch to boardgame.io once feature parity is achieved

2. **Key Files to Migrate First**:
   - Game types structure
   - Move processing logic
   - State initialization
   - Card evaluation

3. **Potential Challenges**:
   - Moving from imperative to declarative state updates
   - Adapting to boardgame.io's turn-based structure
   - Managing the complexity of game phases
   - Converting WebSocket logic to boardgame.io multiplayer

## Phase 12: UI Migration

1. Reuse existing UI components where possible, connecting them to boardgame.io:
   ```typescript
   // Example of connecting an existing UI component
   import { BoardProps } from 'boardgame.io/react';
   import { CozenState } from '../boardgame/types';
   import { existingBoardRenderer } from '../utils/gameVisualizer';
   
   export function CozenBoard({ G, ctx, moves }: BoardProps<CozenState>) {
     // Transform boardgame.io state to format expected by existing components
     const adaptedState = adaptStateForRenderer(G, ctx);
     
     // Use the existing renderer
     return (
       <div>
         {existingBoardRenderer(adaptedState, {
           onStake: (cardId) => moves.stakeCard(cardId),
           onWager: (cardIds, column) => moves.wagerCards(cardIds, column),
           // ...other handlers
         })}
       </div>
     );
   }
   ```

## Implementation Timeline

1. **Weeks 1-2**: Setup and basic game logic
   - Install dependencies
   - Define state structure
   - Create initial game object

2. **Weeks 3-4**: Core game logic
   - Port move handling
   - Implement board scoring
   - Convert state management

3. **Weeks 5-6**: Multiplayer and server
   - Set up boardgame.io server
   - Implement MongoDB storage adapter
   - Create API endpoints

4. **Weeks 7-8**: Client and UI
   - Create client integration
   - Port UI components
   - Implement game visualization

5. **Weeks 9-10**: Testing and refinement
   - Write tests for functionality
   - Compare with existing implementation
   - Fix issues and refine

## Conclusion

Migrating Cozen to boardgame.io will yield significant benefits in state management, multiplayer functionality, and code maintainability. While the migration process requires substantial refactoring, the end result will be a more robust implementation that leverages a battle-tested framework specifically designed for turn-based games.

The incremental approach outlined above allows for parallel development and thorough testing before making a complete switch, minimizing risk and ensuring feature parity with the existing implementation.