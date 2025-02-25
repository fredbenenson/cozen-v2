import _ from 'lodash';
import { AIMove } from './aiTypes';
import { Color } from '../types/game';

/**
 * Generate a random number using Poisson distribution
 * Matches the original implementation's behavior
 */
export function rpois(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
}

/**
 * Remove duplicated moves (same cards played to the same column)
 * Direct port from the original implementation
 */
export function deduplicateHands(moves: AIMove[]): AIMove[] {
  const deDupedMoves: AIMove[] = [];
  const moveIDs: string[] = [];

  moves.forEach(move => {
    let moveID = `${move.column}:`;

    // Ensure cards are sorted for consistent deduplication
    const sortedCards = [...move.cards].sort();

    sortedCards.forEach(card => {
      if (card.includes('_')) {
        moveID += card.split('_')[1];
      } else {
        moveID += card; // Handle the case where it's already just the ID
      }
    });

    if (!moveIDs.includes(moveID)) {
      moveIDs.push(moveID);
      deDupedMoves.push(move);
    }
  });

  return deDupedMoves;
}

/**
 * Mark moves that unnecessarily split pairs
 * Direct port from the original implementation
 */
export function filterStakedPairs(moves: AIMove[], hand: any[]): void {
  moves.forEach(move => {
    if (move.didStake && move.cards.length > 0) {
      // Handle both string IDs and card objects
      let cardId = move.cards[0];
      let cardNumber: number;

      // Extract the card number from the ID
      if (typeof cardId === 'string' && cardId.includes('_')) {
        cardNumber = parseInt(cardId.split('_')[1]);
      } else if (typeof cardId === 'object' && cardId.number) {
        cardNumber = cardId.number;
      } else {
        return; // Skip if we can't determine the card number
      }

      // Get all card numbers in hand
      const handCardNumbers = hand.map(c =>
        typeof c === 'object' ? c.number : parseInt(c.split('_')[1])
      );

      // Check if staking would split a pair
      if (handCardNumbers.filter(c => c === cardNumber).length > 1) {
        move.splitPair = true;
      }
    }
  });
}

/**
 * Make a deep copy of a round for simulation
 */
export function copyRound(round: any, i: number): any {
  const copy = _.cloneDeep(round);
  copy.name = `${round.name || 'root'}-${i}`;
  return copy;
}

/**
 * Hide opponent's poison king (70 VP card) during evaluation
 * to prevent AI from "cheating" by seeing it
 */
export function hidePoison(round: any, playerColor: Color): void {
  if (!round) return;

  const opponentColor = playerColor === Color.Red ? Color.Black : Color.Red;

  // Handle all places where poison king could appear
  if (round.columns && Array.isArray(round.columns)) {
    round.columns.forEach((column: any) => {
      if (!column) return;

      // Check cards in positions
      if (column.positions && Array.isArray(column.positions)) {
        column.positions.forEach((position: any) => {
          if (!position || !position.card) return;

          if (position.card.color === opponentColor && position.card.victoryPoints === 70) {
            // Make it look like a regular king (10 VP)
            position.card.victoryPoints = 10;
          }
        });
      }

      // Check the staked card
      if (column.stakedCard &&
          column.stakedCard.color === opponentColor &&
          column.stakedCard.victoryPoints === 70) {
        column.stakedCard.victoryPoints = 10;
      }
    });
  }

  // Also check in flattened format (for compatibility with original implementation)
  if (round.columns && typeof round.columns === 'object') {
    _.chain(round.columns)
      .flatten()
      .filter((p: any) => p && p.card && p.card.owner &&
              p.card.owner.color === opponentColor &&
              p.card.victory_points === 70)
      .value()
      .forEach((c: any) => {
        c.card.victory_points = 10;
      });
  }
}

/**
 * Generate all permutations of cards from a hand
 * Direct port from the original implementation
 */
export function generateHandPermutations(hand: any[]): any[][] {
  const result: any[][] = [];

  const combine = (start: any[], rest: any[]): void => {
    if (start.length > 0) {
      result.push(start);
    }

    for (let i = 0; i < rest.length; i++) {
      combine([...start, rest[i]], rest.slice(i + 1));
    }
  };

  combine([], hand);
  return result;
}
