import { INVALID_MOVE } from 'boardgame.io/core';
// Import Game correctly based on boardgame.io v0.50.2
import type { Game } from 'boardgame.io';
import { CozenState, Card } from '../types/game';
import { setupGame } from './setup';
import { checkVictory, scoreBoard, setupNextRound } from '../utils/boardUtils';
import { enumerate } from '../ai/enumerate';

// Move implementations
const moves = {
  // Stake a card in the stakes row
  stakeCard: ({ G, ctx }: any, cardId: string) => {
    // Map numeric player IDs to red/black colors
    const playerColor = ctx.currentPlayer === '0' ? 'red' : 'black';
    const player = G.players[playerColor];
    
    // Check if it's this player's turn in our game state
    if (G.activePlayer !== playerColor) {
      console.log(`Not ${playerColor}'s turn, it's ${G.activePlayer}'s turn`);
      return INVALID_MOVE;
    }
    
    // Find the card in player's hand
    const cardIndex = player.hand.findIndex((card: any) => card.id === cardId);
    if (cardIndex === -1) {
      console.log(`Card ${cardId} not found in ${playerColor}'s hand`);
      return INVALID_MOVE;
    }
    
    // Get valid stake column
    const column = getValidStakeColumn(playerColor, G);
    if (column === undefined) {
      console.log(`No valid stake column for ${playerColor}`);
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
    
    // Update available stakes
    const stakeIndex = player.availableStakes.indexOf(column);
    if (stakeIndex !== -1) {
      player.availableStakes.splice(stakeIndex, 1);
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
      console.log(`Not ${playerColor}'s turn, it's ${G.activePlayer}'s turn`);
      return INVALID_MOVE;
    }
    
    // Check if column has a stake
    if (!G.board[column] || !G.board[column].stakedCard) {
      console.log(`Column ${column} does not have a stake`);
      return INVALID_MOVE;
    }
    
    // Find cards in hand
    const cardsToPlay: any[] = [];
    const indicesToRemove: number[] = [];
    
    for (const cardId of cardIds) {
      const index = player.hand.findIndex(card => card.id === cardId);
      if (index === -1) {
        console.log(`Card ${cardId} not found in ${playerColor}'s hand`);
        return INVALID_MOVE;
      }
      
      const card = { ...player.hand[index] };
      card.played = true;
      card.owner = playerColor;
      cardsToPlay.push(card);
      indicesToRemove.push(index);
    }
    
    if (cardsToPlay.length === 0) {
      console.log(`No cards to play`);
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

// Helper function to get valid stake column
function getValidStakeColumn(playerColor: 'red' | 'black', G: CozenState): number | undefined {
  const player = G.players[playerColor];
  
  // If no available stakes, can't stake
  if (player.availableStakes.length === 0) return undefined;
  
  // Rule: Stakes must be placed outward from center
  // Black stakes are 0-4, Red stakes are 5-9
  // Find the next valid stake column
  if (playerColor === 'black') {
    // For black, we move right-to-left from the center
    return player.availableStakes.sort((a, b) => b - a)[0];
  } else {
    // For red, we move left-to-right from the center
    return player.availableStakes.sort((a, b) => a - b)[0];
  }
}

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
  const column = G.board[columnIndex];
  
  // Find empty positions owned by this player
  const availablePositions = column.positions
    .map((pos, index) => ({ pos, index }))
    .filter(item => item.pos.owner === playerColor && !item.pos.card);
  
  // Sort positions based on player (red plays bottom-up, black plays top-down)
  availablePositions.sort((a, b) => {
    if (playerColor === 'red') {
      return b.pos.coord[0] - a.pos.coord[0]; // Red plays bottom-up
    } else {
      return a.pos.coord[0] - b.pos.coord[0]; // Black plays top-down
    }
  });
  
  // If we have available positions, place all cards in the first position
  if (availablePositions.length > 0) {
    const posIndex = availablePositions[0].index;
    // Directly modify the position's card property
    G.board[columnIndex].positions[posIndex].card = cards;
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
      endIf: () => true, // Always end after processing
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