import { INVALID_MOVE } from 'boardgame.io/core';
import { Game } from 'boardgame.io/core';
import { CozenState, Card } from '../types/game';
import { setupGame } from './setup';
import { checkVictory, scoreBoard, setupNextRound } from '../utils/boardUtils';
import { enumerate } from '../ai/enumerate';

// Move implementations
const moves = {
  // Stake a card in the stakes row
  stakeCard: ({ G, ctx }: any, cardId: string) => {
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
    
    // Create a copy of the state (for immutability)
    const newG = { ...G };
    const newPlayer = { ...newG.players[playerColor] };
    newG.players = { ...newG.players, [playerColor]: newPlayer };
    
    // Get the card and remove from hand
    const card = { ...newPlayer.hand[cardIndex] };
    newPlayer.hand = [
      ...newPlayer.hand.slice(0, cardIndex),
      ...newPlayer.hand.slice(cardIndex + 1)
    ];
    
    // Mark card as played and set owner
    card.played = true;
    card.owner = playerColor;
    
    // Place stake in column
    newG.board = [...newG.board];
    newG.board[column] = { ...newG.board[column], stakedCard: card };
    
    // Update available stakes
    newPlayer.availableStakes = newPlayer.availableStakes.filter((c: number) => c !== column);
    
    // Draw a new card if not in last_play state
    if (newG.roundState !== 'last_play' && newPlayer.cards.length > 0) {
      const newCard = newPlayer.cards[0];
      newPlayer.hand = [...newPlayer.hand, newCard];
      newPlayer.cards = newPlayer.cards.slice(1);
    }
    
    // Check if this affects game state
    checkLastPlayState(newG);
    checkRoundCompleteState(newG);
    
    // Switch active player
    newG.activePlayer = newG.inactivePlayer;
    newG.inactivePlayer = playerColor;
    
    return newG;
  },
  
  // Wager cards in a column
  wagerCards: ({ G, ctx }: any, cardIds: string[], column: number) => {
    const playerColor = ctx.currentPlayer === '0' ? 'red' : 'black';
    
    // Check if it's this player's turn in our game state
    if (G.activePlayer !== playerColor) {
      console.log(`Not ${playerColor}'s turn, it's ${G.activePlayer}'s turn`);
      return INVALID_MOVE;
    }
    
    // Create a copy of the state (for immutability)
    const newG = { ...G };
    const newPlayer = { ...newG.players[playerColor] };
    newG.players = { ...newG.players, [playerColor]: newPlayer };
    
    // Check if column has a stake
    if (!newG.board[column] || !newG.board[column].stakedCard) {
      console.log(`Column ${column} does not have a stake`);
      return INVALID_MOVE;
    }
    
    // Find cards in hand
    const cardsToPlay: any[] = [];
    const newHand = [...newPlayer.hand];
    const indicesToRemove: number[] = [];
    
    for (const cardId of cardIds) {
      const index = newHand.findIndex(card => card.id === cardId);
      if (index === -1) {
        console.log(`Card ${cardId} not found in ${playerColor}'s hand`);
        return INVALID_MOVE;
      }
      
      const card = { ...newHand[index] };
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
      newHand.splice(index, 1);
    }
    newPlayer.hand = newHand;
    
    // Place cards in the column
    placeWageredCards(newG, playerColor, cardsToPlay, column);
    
    // Check if this affects game state
    checkLastPlayState(newG);
    checkRoundCompleteState(newG);
    
    // Switch active player
    newG.activePlayer = newG.inactivePlayer;
    newG.inactivePlayer = playerColor;
    
    return newG;
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
  
  // Create a copy of the column
  G.board[columnIndex] = { ...column };
  G.board[columnIndex].positions = [...column.positions];
  
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
    G.board[columnIndex].positions[posIndex] = {
      ...G.board[columnIndex].positions[posIndex],
      card: cards // Store all cards in the position
    };
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
          // Start with current active player
          first: ({ G }) => {
            return G.activePlayer === 'red' ? 0 : 1;
          },
          // Always alternate
          next: ({ G }) => {
            return G.activePlayer === 'red' ? 1 : 0;
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
        // Create a copy of the state
        const newG = { ...G };
        
        // Score the board and determine winners of contested columns
        scoreBoard(newG);
        
        // Check for game winner
        const winner = checkVictory(newG);
        
        // If no winner, set up the next round
        if (!winner) {
          setupNextRound(newG);
        }
        
        return newG;
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
    // Hide opponent's hand
    if (playerID === '0' || playerID === '1') {
      const playerColor = playerID === '0' ? 'red' : 'black';
      const opponentColor = playerID === '0' ? 'black' : 'red';
      
      return {
        ...G,
        players: {
          ...G.players,
          [opponentColor]: {
            ...G.players[opponentColor],
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