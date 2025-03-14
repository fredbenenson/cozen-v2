import { INVALID_MOVE } from 'boardgame.io/core';
// Import Game and Ctx correctly based on boardgame.io v0.50.2
import type { Game, Ctx } from 'boardgame.io';
import { CozenState, Card, PlayerID } from '../types/game';
import { setupGame } from './setup';
import { checkVictory, scoreBoard, setupNextRound } from '../utils/boardUtils';
import { enumerate } from '../ai/enumerate';
import * as aiUtils from '../ai/aiUtils';
import { getSortedPositionsForColumn, hasValidWagerPositions, isValidWagerPosition, BOARD } from '../utils/moveValidation';

// Flags to control logging
let ENABLE_LOGGING = false;

// Make SUPPRESS_AI_LOGS globally accessible for other modules
let SUPPRESS_AI_LOGS = true;
try {
  // For browser environments
  if (typeof window !== 'undefined') {
    (window as any).SUPPRESS_AI_LOGS = true;
  }
  // For Node environments
  else if (typeof global !== 'undefined') {
    (global as any).SUPPRESS_AI_LOGS = true;
  }
} catch (e) {
  // Ignore errors if global/window are not accessible
}

// Store original console methods
const originalLog = console.log;
const originalError = console.error;

// Override console methods to filter out AI-related noise
const filteredLog = function(...args: any[]) {
  // Handle empty args
  if (!args.length) return;

  try {
    // Convert args to string for checking
    const msg = args.map(arg => {
      try {
        return typeof arg === 'string' ? arg :
               typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : String(arg);
      } catch {
        return String(arg);
      }
    }).join(' ');

    // Check if this is AI-related or an error from boardgame.io
    const isAIRelated =
      msg.includes('AI') ||
      msg.includes('enumerate') ||
      msg.includes('minimax') ||
      msg.includes('invalid move') ||  // Filter out invalid move errors from AI simulation
      msg.includes('MCTS') ||
      msg.includes('setImmediate') ||
      msg.includes('iteration') ||
      msg.includes('playout');

    // Only log if we're not suppressing AI logs or if this isn't AI-related
    if (!SUPPRESS_AI_LOGS || !isAIRelated) {
      originalLog.apply(console, args);
    }
  } catch (e) {
    // If anything goes wrong in our filtering, just log the original message
    originalLog.apply(console, args);
  }
};

// Filter errors in a similar way, but keep important ones
const filteredError = function(...args: any[]) {
  if (!args.length) return;

  try {
    const msg = args.join(' ');

    // Only filter AI simulation errors
    const isAISimulationError =
      msg.includes('invalid move') &&
      (msg.includes('asyncIteration') || msg.includes('MCTS') || msg.includes('playout'));

    if (!SUPPRESS_AI_LOGS || !isAISimulationError) {
      originalError.apply(console, args);
    }
  } catch (e) {
    // If anything goes wrong, log the original error
    originalError.apply(console, args);
  }
};

// Functions to control logging
export function enableGameLogging() {
  ENABLE_LOGGING = true;
  originalLog("Game logging enabled");
}

export function disableGameLogging() {
  ENABLE_LOGGING = false;
  originalLog("Game logging disabled");
}

// Function to get detailed diagnostics about why a move is invalid
function logMoveValidationFailure(moveType: string, args: any[], reason: string) {
  if (ENABLE_LOGGING && !SUPPRESS_AI_LOGS) {
    console.log(`[MCTS Debug] Invalid ${moveType}: ${JSON.stringify(args)} - Reason: ${reason}`);
  }
}

// Turn AI logging on/off
export function suppressAILogs() {
  SUPPRESS_AI_LOGS = true;
  try {
    if (typeof window !== 'undefined') {
      (window as any).SUPPRESS_AI_LOGS = true;
    } else if (typeof global !== 'undefined') {
      (global as any).SUPPRESS_AI_LOGS = true;
    }
  } catch (e) {}
  originalLog("AI logs suppressed");
}

export function showAILogs() {
  SUPPRESS_AI_LOGS = false;
  try {
    if (typeof window !== 'undefined') {
      (window as any).SUPPRESS_AI_LOGS = false;
    } else if (typeof global !== 'undefined') {
      (global as any).SUPPRESS_AI_LOGS = false;
    }
  } catch (e) {}
  originalLog("AI logs shown");
}

// Suppress AI logs by default
suppressAILogs();

// Interface for move context
interface MoveContext {
  G: CozenState;
  ctx: Ctx;
  events?: {
    endTurn: () => void;
    endPhase: () => void;
    setPhase: (phase: string) => void;
    endGame: (result?: any) => void;
  };
}

// NOTE: We've removed the manual turn advancement code
// Boardgame.io will handle turn changes automatically with moveLimit: 1

// Move implementations
const moves = {
  // Toggle visibility of opponent cards (for debugging)
  toggleOpponentCards: ({ G, ctx }: MoveContext) => {
    // Toggle the developer mode flag
    G.developerMode = !G.developerMode;

    // Log the change
    console.log(`Opponent cards ${G.developerMode ? 'revealed' : 'hidden'} (dev mode ${G.developerMode ? 'on' : 'off'})`);

    // Return the modified game state
    return G;
  },

  // Stake a card in the stakes row
  stakeCard: ({ G, ctx }: MoveContext, cardId: string) => {
    // Defensive check - make sure ctx and currentPlayer exist
    if (!ctx || typeof ctx.currentPlayer === 'undefined') {
      console.error('stakeCard: ctx or ctx.currentPlayer is undefined');
      return INVALID_MOVE;
    }

    // Map numeric player IDs to red/black colors
    const playerColor = ctx.currentPlayer === '0' ? 'red' as PlayerID : 'black' as PlayerID;
    const player = G.players[playerColor];

    // Find the card in player's hand
    const cardIndex = player.hand.findIndex((card: Card) => card.id === cardId);
    if (cardIndex === -1) {
      logMoveValidationFailure('stakeCard', [cardId], `Card ${cardId} not found in ${playerColor}'s hand`);
      return INVALID_MOVE;
    }

    // Check if player has any available stake columns
    if (player.availableStakes.length === 0) {
      logMoveValidationFailure('stakeCard', [cardId], `No available stake columns for ${playerColor}`);
      return INVALID_MOVE;
    }

    // Get the next valid stake column based on game rules
    // Red stakes from center outward (columns 5-9)
    // Black stakes from center outward (columns 4-0)
    let column: number;
    if (playerColor === 'red') {
      // Red stakes left-to-right from column 5
      column = Math.min(...player.availableStakes);
    } else {
      // Black stakes right-to-left from column 4
      column = Math.max(...player.availableStakes);
    }

    // Double-check the column is actually available and doesn't already have a stake
    if (G.board[column].stakedCard) {
      if (ENABLE_LOGGING) console.log(`Column ${column} already has a stake card`);
      return INVALID_MOVE;
    }

    // Get the card and remove from hand (modify G directly)
    const card = { ...player.hand[cardIndex] };
    player.hand.splice(cardIndex, 1);

    // Mark card as played and set owner
    card.played = true;
    card.owner = playerColor;

    // Place stake in column
    G.board[column].stakedCard = card;

    // Remove this column from available stakes
    player.availableStakes = player.availableStakes.filter(c => c !== column);

    // Log the stake action
    if (ENABLE_LOGGING) {
      console.log(`${playerColor} staked a ${card.number} in column ${column}`);
      console.log(`Remaining stakes for ${playerColor}: ${player.availableStakes.join(', ')}`);
    }

    // Draw a new card if not in last_play state
    if (G.roundState !== 'last_play' && player.cards.length > 0) {
      const newCard = player.cards[0];
      player.hand.push(newCard);
      player.cards.shift();
    }

    // Check if this affects game state
    checkLastPlayState(G);
    checkRoundCompleteState(G);

    // With moveLimit: 1, boardgame.io will handle turn advancement automatically
    if (ENABLE_LOGGING) {
      console.log(`Move complete (stakeCard). Player: ${playerColor}`);
    }

    // Check for round completion
    if (G.roundState === 'complete' && ENABLE_LOGGING) {
      console.log('Round complete in stakeCard, phase transition will happen automatically');
    }

    // Don't return anything - Immer will handle the immutability
  },

  // Wager cards in a column
  wagerCards: ({ G, ctx }: MoveContext, cardIds: string[], column: number) => {
    // Defensive check for ctx and currentPlayer
    if (!ctx || typeof ctx.currentPlayer === 'undefined') {
      console.error('wagerCards: ctx or ctx.currentPlayer is undefined');
      return INVALID_MOVE;
    }

    // Map numeric player IDs to red/black colors
    const playerColor = ctx.currentPlayer === '0' ? 'red' as PlayerID : 'black' as PlayerID;
    const player = G.players[playerColor];

    // Check if column has a stake
    if (!G.board[column] || !G.board[column].stakedCard) {
      logMoveValidationFailure('wagerCards', [cardIds, column], `Column ${column} does not have a stake`);
      return INVALID_MOVE;
    }

    // Players can wager in any column that has a stake
    // The column check was removed - players can wager in any column that has a stake
    // The position check will ensure they can only place cards in their territory

    // Then check if player has valid wager positions in this column
    if (!hasValidWagerPositions(G, column, playerColor)) {
      logMoveValidationFailure('wagerCards', [cardIds, column], `No valid wager positions for ${playerColor} in column ${column}`);
      return INVALID_MOVE;
    }

    // Find cards in hand
    const cardsToPlay: Card[] = [];
    const indicesToRemove: number[] = [];

    // Validate that we have card IDs to play
    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      logMoveValidationFailure('wagerCards', [cardIds, column], `No cards provided`);
      return INVALID_MOVE;
    }

    // Verify each card is in player's hand
    for (const cardId of cardIds) {
      const index = player.hand.findIndex(card => card.id === cardId);
      if (index === -1) {
        logMoveValidationFailure('wagerCards', [cardIds, column], `Card ${cardId} not found in ${playerColor}'s hand`);
        return INVALID_MOVE;
      }

      // Verify card color matches player color
      if (player.hand[index].color !== playerColor) {
        logMoveValidationFailure('wagerCards', [cardIds, column],
          `Card ${cardId} is ${player.hand[index].color}, but player is ${playerColor}`);
        return INVALID_MOVE;
      }

      const card = { ...player.hand[index] };
      card.played = true;
      card.owner = playerColor;
      cardsToPlay.push(card);
      indicesToRemove.push(index);
    }

    if (cardsToPlay.length === 0) {
      logMoveValidationFailure('wagerCards', [cardIds, column], `No valid cards to play`);
      return INVALID_MOVE;
    }

    // Check if we have enough valid positions for all cards
    const validPositions = getSortedPositionsForColumn(G, column, playerColor);
    if (cardsToPlay.length > validPositions.length) {
      logMoveValidationFailure('wagerCards', [cardIds, column],
        `Not enough positions (${validPositions.length}) for all cards (${cardsToPlay.length})`);
      return INVALID_MOVE;
    }

    // Remove cards from hand
    // Sort indices in descending order to avoid shifting issues
    indicesToRemove.sort((a, b) => b - a);
    for (const index of indicesToRemove) {
      player.hand.splice(index, 1);
    }

    // Place cards in the column
    placeWageredCards(G, playerColor, cardsToPlay, column);

    // Check if this affects game state
    checkLastPlayState(G);
    checkRoundCompleteState(G);

    // With moveLimit: 1, boardgame.io will handle turn advancement automatically
    if (ENABLE_LOGGING) {
      console.log(`Move complete (wagerCards). Player: ${playerColor}`);
    }

    // Check for round completion
    if (G.roundState === 'complete' && ENABLE_LOGGING) {
      console.log('Round complete in wagerCards, phase transition will happen automatically');
    }

    // Don't return anything - Immer will handle the immutability
  },
};

// Helper functions for game state updates

// Helper to check if we need to enter last_play state
function checkLastPlayState(G: CozenState) {
  const activePlayer = G.players[G.activePlayer];
  const inactivePlayer = G.players[G.inactivePlayer];

  // If active player just played their last card, enter last_play immediately
  if (activePlayer.hand.length === 0 && G.roundState !== 'last_play' && G.roundState !== 'complete') {
    G.roundState = 'last_play';
    if (ENABLE_LOGGING) {
      console.log(`[DEBUG] ENTERING LAST_PLAY STATE - ${G.activePlayer} has played all cards`);
    }
  }
  // If inactive player has no cards, the next turn will be the final one
  else if (inactivePlayer.hand.length === 0 && G.roundState !== 'last_play' && G.roundState !== 'complete') {
    G.roundState = 'last_play';
    if (ENABLE_LOGGING) {
      console.log(`[DEBUG] ENTERING LAST_PLAY STATE - ${G.inactivePlayer} has played all cards`);
      console.log(`[DEBUG] Inactive player (${G.inactivePlayer}) has ${inactivePlayer.hand.length} cards left`);
      console.log(`[DEBUG] Active player (${G.activePlayer}) has ${activePlayer.hand.length} cards left`);
    }
  }
}

// Helper to check if round is complete
function checkRoundCompleteState(G: CozenState) {
  const activePlayer = G.players[G.activePlayer];
  const inactivePlayer = G.players[G.inactivePlayer];

  // Only log during actual gameplay, not AI simulations
  if (ENABLE_LOGGING) {
    console.log(`[DEBUG] checkRoundCompleteState called with roundState=${G.roundState}`);
    console.log(`[DEBUG] Active player (${G.activePlayer}) has ${activePlayer.hand.length} cards left`);
    console.log(`[DEBUG] Inactive player (${G.inactivePlayer}) has ${inactivePlayer.hand.length} cards left`);
  }

  // According to the rules, round ends after:
  // 1. One player plays their last card (enters last_play state)
  // 2. The other player gets a final turn
  // Then the round is complete regardless of cards remaining

  // If we're in last_play state and the active player has completed their move
  // then the round is complete (this is their "final turn")
  if (G.roundState === 'last_play') {
    // The round is now complete - active player has had their final turn
    G.roundState = 'complete';
    if (ENABLE_LOGGING) {
      console.log('[DEBUG] ROUND COMPLETE - Final turn completed after one player emptied their hand');
      console.log('[DEBUG] *** CRITICAL: Round state set to "complete" ***');
    }
  }

  // Additional check: if both players have no cards, force complete state
  if (activePlayer.hand.length === 0 && inactivePlayer.hand.length === 0 && G.roundState !== 'complete') {
    G.roundState = 'complete';
    if (ENABLE_LOGGING) {
      console.log('[DEBUG] FORCED COMPLETE: Both players have no cards');
    }
  }

  // Final state report
  if (ENABLE_LOGGING) {
    console.log(`[DEBUG] After checks, roundState=${G.roundState}`);
  }
}


// Helper function to place cards in a column
function placeWageredCards(
  G: CozenState,
  playerColor: PlayerID,
  cards: Card[],
  columnIndex: number
) {
  if (ENABLE_LOGGING) {
    console.log(`${playerColor} is trying to wager ${cards.length} cards in column ${columnIndex}`);
  }

  // Get empty positions for this player in this column, properly sorted
  const positionIds = getSortedPositionsForColumn(G, columnIndex, playerColor);

  if (ENABLE_LOGGING) {
    console.log(`Found ${positionIds.length} empty positions for ${playerColor} in column ${columnIndex}`);
  }

  // Convert position IDs to indices in the column's positions array
  const positionIndices = positionIds.map(id => {
    return G.board[columnIndex].positions.findIndex(pos => pos.n === id);
  }).filter(index => index !== -1);

  // Calculate how many cards we can place
  const cardsToPlace = Math.min(cards.length, positionIndices.length);

  // Place each card in its own position
  for (let i = 0; i < cardsToPlace; i++) {
    const posIndex = positionIndices[i];
    const position = G.board[columnIndex].positions[posIndex];

    // Make sure we're not trying to place in the stake row (5)
    if (position.coord[0] === 5) {
      if (ENABLE_LOGGING) {
        console.log(`Skipping stake row position at ${position.coord}`);
      }
      continue;
    }

    // Set the card directly, not as an array
    G.board[columnIndex].positions[posIndex].card = cards[i];

    if (ENABLE_LOGGING) {
      console.log(`${playerColor} placed card ${cards[i].id} in column ${columnIndex}, position ${posIndex} (row ${position.coord[0]})`);
    }
  }

  if (cardsToPlace === 0 && ENABLE_LOGGING) {
    console.log(`No available positions for ${playerColor} in column ${columnIndex}`);
  } else if (cardsToPlace < cards.length && ENABLE_LOGGING) {
    console.log(`Not enough positions for all cards. Placed ${cardsToPlace}/${cards.length} cards.`);
  }

  // This should be just once at the end
  if (cardsToPlace > 0 && ENABLE_LOGGING) {
    console.log(`Successfully placed ${cardsToPlace} cards in column ${columnIndex} for ${playerColor}`);
  }
}

// Helper to update logging based on current player
// We'll call this in the turn and phase handlers
const updateLogging = (playerID: string) => {
  try {
    // Default to filtering AI logs unless we know it's the human player
    const isHuman = playerID === '0'; // Red/Human is player 0

    if (isHuman) {
      enableGameLogging();
      showAILogs(); // Show all logs during human turns
    } else {
      disableGameLogging();
      suppressAILogs(); // Filter logs during AI turns
    }
  } catch (e) {
    // If anything fails, default to filtering logs
    suppressAILogs();
    console.error("Error updating logging:", e);
  }
};

export const CozenGame: Game<CozenState> = {
  name: 'cozen',

  // Setup function initializes the game state
  setup: setupGame,

  // Move definitions
  moves: moves,

  // Phases for game flow
  phases: {
    play: {
      start: true,
      next: 'roundEnd',
      onBegin: (G: CozenState, ctx: Ctx) => {
        // Log phase beginning
        console.log(`Phase 'play' started`);

        // Update convenience references and logging
        if (ctx && ctx.currentPlayer) {
          const playerColor = ctx.currentPlayer === '0' ? 'red' : 'black';
          G.activePlayer = playerColor;
          G.inactivePlayer = playerColor === 'red' ? 'black' : 'red';

          // Update logging based on who's active
          updateLogging(ctx.currentPlayer);
        }
      },
      endIf: (G: CozenState, ctx: Ctx) => {
        // Null safety check
        if (!G || !G.players) return false;


        // Simple check - just look at the round state that's set in the move functions
        if (G.roundState !== 'complete') {
          // Additional safety checks for when a round should end

          // Both players have no cards
          if (G.players.red.hand.length === 0 && G.players.black.hand.length === 0) {
            G.roundState = 'complete';
          }
          // In last_play state and active player has no cards
          else if (G.roundState === 'last_play' && G.players[G.activePlayer].hand.length === 0) {
            G.roundState = 'complete';
          }
          // One player has no cards after a few turns have been played
          else if ((G.players.red.hand.length === 0 || G.players.black.hand.length === 0) && ctx.turn > 2) {
            G.roundState = 'complete';
          }
        }

        // Simple boolean return
        const shouldEndPhase = G.roundState === 'complete';

        if (ENABLE_LOGGING) {
          console.log(`[DEBUG] Phase change decision: ${shouldEndPhase ? 'YES - Moving to roundEnd' : 'NO - Staying in play phase'}`);
        }

        return shouldEndPhase;
      },
      turn: {
        // Ultra-defensive turn order implementation
        order: {
          first: () => 1,  // Black player starts
          next: (_G, ctx) => {
            try {
              // Use a try/catch to prevent ANY errors from crashing the game
              // During AI simulation, ctx might be incomplete

              // If ctx is missing, just alternate based on turn number
              if (!ctx) {
                return Math.floor(Math.random() * 2); // Fallback to random player
              }

              // If currentPlayer is missing, alternate based on playOrderPos if available
              if (typeof ctx.currentPlayer === 'undefined') {
                if (typeof ctx.playOrderPos !== 'undefined') {
                  return ctx.playOrderPos === 0 ? 1 : 0;
                }
                // If both are missing, just pick a player randomly
                return Math.floor(Math.random() * 2);
              }

              // Normal case - simple alternating: 0->1, 1->0
              return ctx.currentPlayer === '0' ? 1 : 0;
            } catch (e) {
              // If anything fails, return a valid player index
              console.error("Error in turn order next():", e);
              return 0; // Default to red player (0)
            }
          }
        },

        // One move per turn - this is the key to automate turn advancement
        moveLimit: 1,

        // Ultra-defensive onBegin handler
        onBegin: (G, ctx) => {
          try {
            if (ctx && typeof ctx.currentPlayer !== 'undefined') {
              const playerColor = ctx.currentPlayer === '0' ? 'red' : 'black';
              console.log(`Turn started: Player ${playerColor} (${ctx.currentPlayer})`);

              // Update our references for convenience only
              G.activePlayer = playerColor;
              G.inactivePlayer = playerColor === 'red' ? 'black' : 'red';

              // Update logging based on current player
              updateLogging(ctx.currentPlayer);
            } else {
            }
          } catch (e) {
            console.error("Error in turn onBegin:", e);
          }
        },
      },
    },

    roundEnd: {
      moves: {},
      next: 'play',
      // Phase handler for round end
      onBegin: (G: CozenState, ctx: Ctx) => {
        // Log phase beginning
        console.log(`Phase 'roundEnd' started`);

        // Update references if ctx is available
        if (ctx && ctx.currentPlayer) {
          const playerColor = ctx.currentPlayer === '0' ? 'red' : 'black';
          G.activePlayer = playerColor;
          G.inactivePlayer = playerColor === 'red' ? 'black' : 'red';

          // Update logging based on who's active
          updateLogging(ctx.currentPlayer);
        }
        // Process round end logic without returning G
        // Just do the work and let boardgame.io handle state updates


        // Score the board and determine winners of contested columns
        scoreBoard(G);

        // Check for game winner
        const winner = checkVictory(G);


        // If no winner, set up the next round
        if (!winner) {
          setupNextRound(G);
        }

        // Don't return anything
      },
      endIf: (G: CozenState, ctx: Ctx) => {
        // Wait 3 seconds in roundEnd phase before continuing
        // This ensures the client has time to update and show the transition screen
        return true;
      },
    },
  },

  // Game ends when a player reaches 70 victory points
  endIf: (G: CozenState, ctx: Ctx) => {
    // Add null checks for test environments
    if (!G || !G.players) return false;

    if (G.players.red?.victory_points >= 70) {
      return { winner: 'red' };
    }
    if (G.players.black?.victory_points >= 70) {
      return { winner: 'black' };
    }
    return false;
  },

  /**
   * playerView function
   *
   * This function controls what parts of the game state are visible to each player.
   * It receives the raw game state (G) directly from boardgame.io (not nested).
   *
   * @param G - The complete game state (CozenState)
   * @param ctx - The game context from boardgame.io
   * @param playerID - The ID of the player viewing the state ('0' for red, '1' for black)
   * @returns A potentially filtered version of the state for the player
   */
  playerView: (G: CozenState, ctx: Ctx, playerID: string) => {
    // Handle potential G.G nesting (workaround for boardgame.io issue)
    const gameState = (G as any).G ? (G as any).G : G;

    // Basic validation of game state
    if (!gameState || !gameState.players) {
      return G; // Return what we received as a fallback
    }

    // In developer mode, show the complete state to all players
    if (gameState.developerMode) {
      return gameState;
    }

    // Create player-specific views (hide opponent's cards)
    if (playerID === '0' || playerID === '1') {
      // Convert numeric ID to color
      const playerColor = playerID === '0' ? 'red' : 'black';
      const opponentColor = playerID === '0' ? 'black' : 'red';

      // Create a filtered copy of the state
      const playerVisibleState = {
        ...gameState,
        players: {
          ...gameState.players,
          // Hide opponent's hand cards (replace with placeholder objects)
          [opponentColor]: {
            ...gameState.players[opponentColor],
            hand: gameState.players[opponentColor].hand.map((_: Card) => ({ hidden: true } as any)),
          }
        }
      };

      return playerVisibleState;
    }

    // For spectators or AI, return the complete state
    return gameState;
  },

  // AI configuration for boardgame.io's MCTS bot
  ai: {
    enumerate: enumerate
  }

  // Note: The objectives are defined in the CozenClient.tsx file
  // when creating the client with the MCTSBot
  // Note: We're using ctx.events.endTurn() in our move functions to explicitly
  // end turns after moves are made. This is critical for the MCTS AI.
};
