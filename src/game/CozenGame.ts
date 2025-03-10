import { INVALID_MOVE } from 'boardgame.io/core';
// Import Game correctly based on boardgame.io v0.50.2
import type { Game } from 'boardgame.io';
import { CozenState, Card } from '../types/game';
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

// Move implementations
const moves = {
  // Stake a card in the stakes row
  stakeCard: ({ G, ctx }: any, cardId: string) => {
    // Map numeric player IDs to red/black colors
    const playerColor = ctx.currentPlayer === '0' ? 'red' : 'black';
    const player = G.players[playerColor];
    
    // Check if it's this player's turn in our game state
    if (G.activePlayer !== playerColor) {
      if (ENABLE_LOGGING) console.log(`Not ${playerColor}'s turn, it's ${G.activePlayer}'s turn`);
      return INVALID_MOVE;
    }
    
    // Find the card in player's hand
    const cardIndex = player.hand.findIndex((card: any) => card.id === cardId);
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
    
    // Don't return anything - Immer will handle the immutability
  },
  
  // Wager cards in a column
  wagerCards: ({ G, ctx }: any, cardIds: string[], column: number) => {
    // Map numeric player IDs to red/black colors
    const playerColor = ctx.currentPlayer === '0' ? 'red' : 'black';
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
    const cardsToPlay: any[] = [];
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
    
    // Don't return anything - Immer will handle the immutability
  },
};

// Helper functions for game state updates

// Helper to check if we need to enter last_play state
function checkLastPlayState(G: CozenState) {
  const inactivePlayer = G.players[G.inactivePlayer];
  
  if (inactivePlayer.hand.length === 0 && G.roundState !== 'last_play') {
    G.roundState = 'last_play';
  }
}

// Helper to check if round is complete
function checkRoundCompleteState(G: CozenState) {
  const activePlayer = G.players[G.activePlayer];
  
  if (activePlayer.hand.length === 0 && G.roundState === 'last_play') {
    G.roundState = 'complete';
  }
}


// Helper function to place cards in a column
function placeWageredCards(
  G: CozenState,
  playerColor: 'red' | 'black',
  cards: any[],
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

export const CozenGame: any = {
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
      endIf: ({ G }) => G.roundState === 'complete',
      turn: {
        // Use our own turn order system in the game state
        order: {
          // Start with current active player (0=red, 1=black)
          first: ({ G }) => {
            return G.activePlayer === 'red' ? 0 : 1;
          },
          // Always alternate between players
          next: ({ ctx }) => {
            return ctx.playOrderPos === 0 ? 1 : 0;
          }
        },
        // We're going to handle turn switching in our move functions
        moveLimit: 1,
        onBegin: ({ G }) => {
          // No automatic turn changes needed, handled in moves
          return G;
        },
        onEnd: ({ G }) => {
          // No automatic turn changes needed, handled in moves
          return G;
        }
      },
    },
    
    roundEnd: {
      moves: {},
      next: 'play',
      onBegin: ({ G }) => {
        // Score the board and determine winners of contested columns
        scoreBoard(G);
        
        // Check for game winner
        const winner = checkVictory(G);
        
        // If no winner, set up the next round
        if (!winner) {
          setupNextRound(G);
        }
        
        // Don't return anything - let Immer handle immutability
      },
      endIf: ({ G }) => {
        // Wait at least 500ms in roundEnd phase before continuing
        // This ensures the client has time to update before starting a new round
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(true);
          }, 500);
        });
      },
    },
  },
  
  // Game ends when a player reaches 70 victory points
  endIf: ({ G }) => {
    if (G.players.red.victory_points >= 70) {
      return { winner: 'red' };
    }
    if (G.players.black.victory_points >= 70) {
      return { winner: 'black' };
    }
    return false;
  },
  
  // Define what parts of state are private to each player
  playerView: ({ G, playerID }) => {
    // Hide opponent's hand - only if playerID is provided
    if (playerID === '0' || playerID === '1') {
      // Map numeric player IDs to colors
      const playerColor = playerID === '0' ? 'red' : 'black';
      const opponentColor = playerID === '0' ? 'black' : 'red';
      
      return {
        ...G,
        players: {
          ...G.players,
          [opponentColor]: {
            ...G.players[opponentColor],
            // Replace actual cards with hidden placeholders
            hand: G.players[opponentColor].hand.map((card: any) => ({ hidden: true })),
          }
        }
      };
    }
    return G;
  },
  
  // AI move enumeration
  ai: {
    enumerate: enumerate
  }
};