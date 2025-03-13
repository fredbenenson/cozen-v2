import { INVALID_MOVE } from 'boardgame.io/core';
// Import Game and Ctx correctly based on boardgame.io v0.50.2
import type { Game, Ctx } from 'boardgame.io';
import { CozenState, Card, PlayerID } from '../types/game';
import { setupGame } from './setup';
import { checkVictory, scoreBoard, setupNextRound } from '../utils/boardUtils';
import { enumerate } from '../ai/enumerate';
import { getSortedPositionsForColumn, hasValidWagerPositions, isValidWagerPosition, BOARD } from '../utils/moveValidation';

// Flag to control logging - helps reduce noise during AI simulations
let ENABLE_LOGGING = false;

// Functions to control logging
export function enableGameLogging() {
  ENABLE_LOGGING = true;
  console.log("Game logging enabled");
}

export function disableGameLogging() {
  ENABLE_LOGGING = false;
  console.log("Game logging disabled");
}

// Interface for move context
interface MoveContext {
  G: CozenState;
  ctx: Ctx;
}

// Move implementations
const moves = {
  
  // Stake a card in the stakes row
  stakeCard: ({ G, ctx }: MoveContext, cardId: string) => {
    // Map numeric player IDs to red/black colors
    const playerColor = ctx.currentPlayer === '0' ? 'red' as PlayerID : 'black' as PlayerID;
    const player = G.players[playerColor];
    
    // Check if it's this player's turn in our game state
    if (G.activePlayer !== playerColor) {
      if (ENABLE_LOGGING) console.log(`Not ${playerColor}'s turn, it's ${G.activePlayer}'s turn`);
      return INVALID_MOVE;
    }
    
    // Find the card in player's hand
    const cardIndex = player.hand.findIndex((card: Card) => card.id === cardId);
    if (cardIndex === -1) {
      if (ENABLE_LOGGING) console.log(`Card ${cardId} not found in ${playerColor}'s hand`);
      return INVALID_MOVE;
    }
    
    // Check if player has any available stake columns
    if (player.availableStakes.length === 0) {
      if (ENABLE_LOGGING) console.log(`No available stake columns for ${playerColor}`);
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
    
    // Switch active player
    G.activePlayer = G.inactivePlayer;
    G.inactivePlayer = playerColor;
    
    // Just set the round state, let boardgame.io handle the transitions
    if (G.roundState === 'complete' && ENABLE_LOGGING) {
      console.log('Round complete in stakeCard, phase transition will happen automatically');
    }
    
    // Don't return anything - Immer will handle the immutability
  },
  
  // Wager cards in a column
  wagerCards: ({ G, ctx }: MoveContext, cardIds: string[], column: number) => {
    // Map numeric player IDs to red/black colors
    const playerColor = ctx.currentPlayer === '0' ? 'red' as PlayerID : 'black' as PlayerID;
    const player = G.players[playerColor];
    
    // Check if it's this player's turn in our game state
    if (G.activePlayer !== playerColor) {
      if (ENABLE_LOGGING) console.log(`Not ${playerColor}'s turn, it's ${G.activePlayer}'s turn`);
      return INVALID_MOVE;
    }
    
    // Check if column has a stake
    if (!G.board[column] || !G.board[column].stakedCard) {
      if (ENABLE_LOGGING) console.log(`Column ${column} does not have a stake`);
      return INVALID_MOVE;
    }
    
    // Players can wager in any column that has a stake
    // The column check was removed - players can wager in any column that has a stake
    // The position check will ensure they can only place cards in their territory
    
    // Then check if player has valid wager positions in this column
    if (!hasValidWagerPositions(G, column, playerColor)) {
      if (ENABLE_LOGGING) console.log(`No valid wager positions for ${playerColor} in column ${column}`);
      return INVALID_MOVE;
    }
    
    // Find cards in hand
    const cardsToPlay: Card[] = [];
    const indicesToRemove: number[] = [];
    
    for (const cardId of cardIds) {
      const index = player.hand.findIndex(card => card.id === cardId);
      if (index === -1) {
        if (ENABLE_LOGGING) console.log(`Card ${cardId} not found in ${playerColor}'s hand`);
        return INVALID_MOVE;
      }
      
      const card = { ...player.hand[index] };
      card.played = true;
      card.owner = playerColor;
      cardsToPlay.push(card);
      indicesToRemove.push(index);
    }
    
    if (cardsToPlay.length === 0) {
      if (ENABLE_LOGGING) console.log(`No cards to play`);
      return INVALID_MOVE;
    }
    
    // Check if we have enough valid positions for all cards
    const validPositions = getSortedPositionsForColumn(G, column, playerColor);
    if (cardsToPlay.length > validPositions.length) {
      if (ENABLE_LOGGING) console.log(`Not enough positions (${validPositions.length}) for all cards (${cardsToPlay.length})`);
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
    
    // Switch active player
    G.activePlayer = G.inactivePlayer;
    G.inactivePlayer = playerColor;
    
    // Just set the round state, let boardgame.io handle the transitions
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
      endIf: (G: CozenState, ctx: Ctx) => {
        // Null safety check 
        if (!G || !G.players) return false;
        
        // Only log during actual gameplay, not AI simulations
        if (ENABLE_LOGGING) {
          console.log(`[DEBUG] Phase endIf check: roundState=${G.roundState}`);
          console.log(`[DEBUG] Red cards: ${G.players.red.hand.length}, Black cards: ${G.players.black.hand.length}`);
        }
        
        // Simple check - just look at the round state that's set in the move functions
        if (G.roundState !== 'complete') {
          // Additional safety checks for when a round should end
          
          // Both players have no cards
          if (G.players.red.hand.length === 0 && G.players.black.hand.length === 0) {
            if (ENABLE_LOGGING) console.log('[DEBUG] FORCED COMPLETE: Both players have no cards');
            G.roundState = 'complete';
          }
          // In last_play state and active player has no cards 
          else if (G.roundState === 'last_play' && G.players[G.activePlayer].hand.length === 0) {
            if (ENABLE_LOGGING) console.log('[DEBUG] FORCED COMPLETE: Active player has no cards in last_play state');
            G.roundState = 'complete';
          }
          // One player has no cards after a few turns have been played
          else if ((G.players.red.hand.length === 0 || G.players.black.hand.length === 0) && ctx.turn > 2) {
            if (ENABLE_LOGGING) console.log('[DEBUG] DETECTED INCOMPLETE ROUND: One player has no cards');
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
        // Use our own turn order system in the game state
        order: {
          // Start with current active player (0=red, 1=black)
          first: (G: CozenState, ctx: Ctx) => {
            return G.activePlayer === 'red' ? 0 : 1;
          },
          // Always alternate between players
          next: (G: CozenState, ctx: Ctx) => {
            return ctx.playOrderPos === 0 ? 1 : 0;
          }
        },
        // We're going to handle turn switching in our move functions
        moveLimit: 1,
        // No onBegin or onEnd handlers - they can cause serialization issues
        // Just let boardgame.io handle the turn transitions
      },
    },
    
    roundEnd: {
      moves: {},
      next: 'play',
      // Instead of using onBegin, use a move that is automatically triggered
      // Move executed at the start of the roundEnd phase
      onBegin: (G: CozenState, ctx: Ctx) => {
        // Process round end logic without returning G
        // Just do the work and let boardgame.io handle state updates
        
        if (ENABLE_LOGGING) {
          console.log('ENTERING ROUND END PHASE');
          console.log(`Round state: ${G.roundState}`);
          console.log(`Red cards left: ${G.players.red.hand.length}, Black cards left: ${G.players.black.hand.length}`);
        }
        
        // Score the board and determine winners of contested columns
        scoreBoard(G);
        
        // Check for game winner
        const winner = checkVictory(G);
        
        if (ENABLE_LOGGING) {
          console.log(`After scoring: Red VP=${G.players.red.victory_points}, Black VP=${G.players.black.victory_points}`);
          console.log(`Winner check: ${winner || 'No winner yet'}`);
        }
        
        // If no winner, set up the next round
        if (!winner) {
          setupNextRound(G);
          if (ENABLE_LOGGING) {
            console.log('Next round setup complete');
            console.log(`New active player: ${G.activePlayer}`);
          }
        }
        
        // Don't return anything
      },
      endIf: (G: CozenState, ctx: Ctx) => {
        // Wait 3 seconds in roundEnd phase before continuing
        // This ensures the client has time to update and show the transition screen
        console.log('[DEBUG] Starting roundEnd timeout (3 seconds)');
        // Return true directly rather than using a Promise
        // Note: This would need a different implementation for true delay
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
    // Debug log to understand what we're receiving
    console.log("playerView called with:", { 
      hasPlayers: G && !!G.players,
      playerID,
      stateKeys: G ? Object.keys(G) : []
    });
    
    // Handle potential G.G nesting (workaround for boardgame.io issue)
    // Get the real game state, handling potential nesting
    const gameState = (G as any).G ? (G as any).G : G;
    
    // Basic validation of game state
    if (!gameState || !gameState.players) {
      console.error("playerView received incomplete game state");
      return G; // Return what we received as a fallback
    }
    
    // In developer mode, show the complete state to all players
    if (gameState.developerMode) {
      console.log("Developer mode enabled, returning full state");
      return gameState;
    }
    
    // Create player-specific views (hide opponent's cards)
    if (playerID === '0' || playerID === '1') {
      // Convert numeric ID to color
      const playerColor = playerID === '0' ? 'red' : 'black';
      const opponentColor = playerID === '0' ? 'black' : 'red';
      
      console.log(`Creating filtered view for ${playerColor} player`);
      
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
  
  // AI move enumeration
  ai: {
    enumerate: enumerate
  }
};