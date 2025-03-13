import { CozenState } from '../types/game';
import { Color } from '../types/game';
import { createDeck, shuffleDeck } from '../utils/deckUtils';
import { createInitialBoard } from '../utils/boardUtils';

/**
 * Setup function for boardgame.io game initialization
 * Creates the initial game state including decks, hands, and board
 */
export function setupGame(ctx: any, setupData?: any): CozenState {
  try {
    // Create and shuffle decks
    const redDeck = shuffleDeck(createDeck(Color.Red));
    const blackDeck = shuffleDeck(createDeck(Color.Black));
    
    // Initialize player hands (first 5 cards)
    const redHand = redDeck.slice(0, 5);
    const blackHand = blackDeck.slice(0, 5);
    
    // Initialize player decks (remaining cards)
    const redCards = redDeck.slice(5);
    const blackCards = blackDeck.slice(5);
    
    // Create initial stakes
    const redStake = redCards.shift()!;
    const blackStake = blackCards.shift()!;
    
    // Create the board with columns
    const board = createInitialBoard();
    
    // Mark initial stake positions
    if (redStake) {
      board[5].stakedCard = redStake;
      redStake.played = true;
      redStake.owner = 'red';
    }
    
    if (blackStake) {
      board[4].stakedCard = blackStake;
      blackStake.played = true;
      blackStake.owner = 'black';
    }
    
    // Create player objects
    const redPlayer = {
      hand: redHand,
      jail: [],
      cards: redCards,
      victory_points: 0,
      availableStakes: [6, 7, 8, 9], // Exclude column 5 which already has a stake
      stake_offset: 1,
    };
    
    const blackPlayer = {
      hand: blackHand,
      jail: [],
      cards: blackCards,
      victory_points: 0,
      availableStakes: [0, 1, 2, 3], // Exclude column 4 which already has a stake
      stake_offset: -1,
    };
    
    // Create initial state
    const initialState: CozenState = {
      players: {
        red: redPlayer,
        black: blackPlayer,
      },
      board,
      firstStakes: {
        red: redStake ? [redStake] : [],
        black: blackStake ? [blackStake] : [],
      },
      roundState: 'running',
      activePlayer: 'black', // Black goes first per rules
      inactivePlayer: 'red',
      cardsJailed: 0,
      isFirstRound: true,
      turnCount: 1,
      developerMode: false, // Developer mode disabled by default, toggle via debug panel
      victoryPointScores: {
        red: 0,
        black: 0,
      },
    };
    
    // Log initial state for debugging
    console.log("Game setup complete. Initial state:", { 
      activePlayer: initialState.activePlayer,
      redCards: initialState.players.red.hand.length,
      blackCards: initialState.players.black.hand.length,
      board: initialState.board.length
    });
    
    // Return the initial state
    return initialState;
  } catch (error) {
    console.error("Error during game setup:", error);
    // Create a minimal valid state as fallback
    return {
      players: {
        red: {
          hand: [],
          jail: [],
          cards: [],
          victory_points: 0,
          availableStakes: [],
          stake_offset: 1
        },
        black: {
          hand: [],
          jail: [],
          cards: [],
          victory_points: 0,
          availableStakes: [],
          stake_offset: -1
        }
      },
      board: [],
      firstStakes: { red: [], black: [] },
      roundState: 'running',
      activePlayer: 'black',
      inactivePlayer: 'red',
      cardsJailed: 0,
      isFirstRound: true,
      turnCount: 1,
      developerMode: true,
      victoryPointScores: { red: 0, black: 0 }
    };
  }
}