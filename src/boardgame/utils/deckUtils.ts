import { Card, CozenState } from '../types';
import { Color, Suit } from '../../types/game';

// Create a deck of cards for a player
export function createDeck(color: Color): Card[] {
  const deck: Card[] = [];
  const suits = color === Color.Red ? [Suit.Hearts, Suit.Diamonds] : [Suit.Clubs, Suit.Spades];
  
  // Generate each card
  suits.forEach(suit => {
    // Cards 1-13 (A-K) for each suit
    for (let i = 1; i <= 13; i++) {
      // Determine victory points
      let victoryPoints = i;
      if (i > 10) victoryPoints = 10; // J, Q, K are 10 points
      
      // Special case: King of Hearts and King of Spades are 70 points
      if (i === 13 && (suit === Suit.Hearts || suit === Suit.Spades)) {
        victoryPoints = 70;
      }
      
      // Create card
      const card: Card = {
        id: `${color}-${suit}-${i}`,
        color,
        suit,
        number: i,
        victoryPoints,
        played: false,
      };
      
      deck.push(card);
    }
  });
  
  return deck;
}

// Shuffle a deck of cards
export function shuffleDeck<T>(deck: T[]): T[] {
  return [...deck].sort(() => Math.random() - 0.5);
}

// Get a valid stake column for a player
export function getValidStakeColumn(playerID: 'red' | 'black', G: CozenState): number | undefined {
  const player = G.players[playerID];
  
  // If no available stakes, can't stake
  if (player.availableStakes.length === 0) return undefined;
  
  // Rule: Stakes must be placed outward from center
  // Black stakes are 0-4, Red stakes are 5-9
  // Find the next valid stake column
  if (playerID === 'black') {
    // For black, we move right-to-left from the center
    return player.availableStakes.sort((a, b) => b - a)[0];
  } else {
    // For red, we move left-to-right from the center
    return player.availableStakes.sort((a, b) => a - b)[0];
  }
}