import { CozenState } from '../types/game';
import { Color } from '../types/game';
import { createDeck, shuffleDeck } from '../utils/deckUtils';
import { createInitialBoard } from '../utils/boardUtils';

export function setupGame(): CozenState {
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
  
  // Return initial state
  return {
    players: {
      red: {
        hand: redHand,
        jail: [],
        cards: redCards,
        victory_points: 0,
        availableStakes: [6, 7, 8, 9], // Exclude column 5 which already has a stake
        stake_offset: 1,
      },
      black: {
        hand: blackHand,
        jail: [],
        cards: blackCards,
        victory_points: 0,
        availableStakes: [0, 1, 2, 3], // Exclude column 4 which already has a stake
        stake_offset: -1,
      },
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
}