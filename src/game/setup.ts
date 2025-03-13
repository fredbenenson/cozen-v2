import { CozenState } from '../types/game';
import { Color } from '../types/game';
import { createDeck, shuffleDeck } from '../utils/deckUtils';
import { createInitialBoard } from '../utils/boardUtils';

// Updated to match boardgame.io's expected setup function signature
export function setupGame(ctx: any, setupData?: any): CozenState {
  console.log("Starting game setup with:", { ctx, setupData });
  
  try {
    // Create and shuffle decks
    const redDeck = shuffleDeck(createDeck(Color.Red));
    const blackDeck = shuffleDeck(createDeck(Color.Black));
    
    console.log(`Created decks: Red (${redDeck.length} cards), Black (${blackDeck.length} cards)`);
    
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
    console.log(`Created board with ${board.length} columns`);
    
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
    
    console.log("Created player objects:", {
      redHandCards: redPlayer.hand.length,
      redDeckCards: redPlayer.cards.length,
      blackHandCards: blackPlayer.hand.length,
      blackDeckCards: blackPlayer.cards.length
    });
    
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
      developerMode: true, // Enable developer mode by default during development
      victoryPointScores: {
        red: 0,
        black: 0,
      },
    };
    
    console.log("Initial state created successfully");
    console.log("Initial state keys:", Object.keys(initialState));
    
    // Additional verification for proper initialization
    const verifyState = {
      hasPlayers: !!initialState.players,
      redPlayer: !!initialState.players.red,
      blackPlayer: !!initialState.players.black,
      board: !!initialState.board,
      stateKeys: Object.keys(initialState)
    };
    console.log("State verification before return:", verifyState);
    
    // Return the initial state
    return initialState;
  } catch (error) {
    console.error("Error during game setup:", error);
    // Create a minimal valid state as fallback
    const fallbackState: CozenState = {
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
    
    // Verify the fallback state
    console.log("Creating fallback state with keys:", Object.keys(fallbackState));
    console.log("Fallback state has players:", !!fallbackState.players);
    
    return fallbackState;
  }
}