// src/ai/aiUtils.ts
import _ from 'lodash';
import { AIMove } from './aiTypes';

/**
 * Generates a random number from a Poisson distribution.
 * @param lambda The mean value
 * @returns A Poisson-distributed random integer
 */
export function rpois(lambda: number): number {
  let L = Math.exp(-lambda);
  let p = 1.0;
  let k = 0;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
}

/**
 * Generate all possible permutations of cards from a hand
 * @param hand Array of card objects
 * @returns Array of card combinations
 */
export function generateHandPermutations(hand: any[]): any[][] {
  if (!hand || hand.length === 0) return [];

  // Generate all non-empty subsets (2^n - 1 total)
  const result: any[][] = [];
  const n = hand.length;

  // Iterate through all possible combinations (except empty set)
  for (let i = 1; i < (1 << n); i++) {
    const subset: any[] = [];
    for (let j = 0; j < n; j++) {
      // If jth bit is set, include the card
      if (i & (1 << j)) {
        subset.push(hand[j]);
      }
    }
    result.push(subset);
  }

  return result;
}

/**
 * Remove duplicate moves from an array of moves
 * @param moves Array of AI moves
 * @returns Deduplicated array of moves
 */
export function deduplicateHands(moves: AIMove[]): AIMove[] {
  // Group moves by column and cards
  const groupedMoves = _.groupBy(moves, (move) => {
    return `${move.column}_${move.cards.sort().join('|')}`;
  });

  // Take first move from each group
  return Object.values(groupedMoves).map(group => group[0]);
}

/**
 * Identify and flag moves that would split potential pairs in hand
 * @param moves Array of AI moves
 * @param hand The player's current hand
 */
export function filterStakedPairs(moves: AIMove[], hand: any[]): void {
  if (!moves || !hand) return;

  moves.forEach(move => {
    if (move.didStake && move.cards.length > 0) {
      // Handle both string IDs and card objects
      const cardId = move.cards[0];
      let cardNumber: number | undefined;

      // Extract the card number from the ID
      if (typeof cardId === 'string' && cardId.includes('_')) {
        const parts = cardId.split('_');
        if (parts.length >= 2) {
          cardNumber = parseInt(parts[1]);
        }
      } else if (typeof cardId === 'object') {
        // Use type assertion to avoid TypeScript errors
        const card = cardId as { number?: number };
        cardNumber = card.number;
      }

      if (cardNumber === undefined) return;

      // Get all card numbers in hand
      const handCardNumbers = hand.map((c: any) => {
        if (c && typeof c === 'object' && 'number' in c) {
          return c.number;
        }
        if (typeof c === 'string' && c.includes('_')) {
          return parseInt(c.split('_')[1]);
        }
        return -1; // Invalid card
      }).filter(num => num !== -1);

      // Check if staking would split a pair
      if (handCardNumbers.filter(c => c === cardNumber).length > 1) {
        move.splitPair = true;
      }
    }
  });
}
