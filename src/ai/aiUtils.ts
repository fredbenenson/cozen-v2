import _ from 'lodash';
import { MoveOption } from './aiTypes';
import { Color } from '../types/game';

/**
 * Generate a random number using Poisson distribution
 * This adds controlled randomness to the AI decision making
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
 */
export function deduplicateHands(moves: MoveOption[]): MoveOption[] {
  const deDupedMoves: MoveOption[] = [];
  const moveIDs: string[] = [];

  moves.forEach(move => {
    // Create a unique ID for each move
    const moveID = `${move.column}:${move.cards.sort().join(',')}`;

    if (!moveIDs.includes(moveID)) {
      moveIDs.push(moveID);
      deDupedMoves.push(move);
    }
  });

  return deDupedMoves;
}

/**
 * Mark moves that unnecessarily split pairs
 */
export function filterStakedPairs(moves: MoveOption[], hand: any[]): void {
  moves.forEach(move => {
    if (move.isStake && move.cards.length > 0) {
      const cardId = move.cards[0];
      const card = hand.find(c => c.id === cardId);
      if (!card) return;

      // Count how many cards of this number are in the hand
      const sameNumberCount = hand.filter(c => c.number === card.number).length;

      // If staking would split a pair, mark it
      if (sameNumberCount > 1) {
        move.splitPair = true;
      }
    }
  });
}

/**
 * Make a deep copy of a round for simulation
 */
export function copyRound(round: any, index: number): any {
  const copy = _.cloneDeep(round);
  copy.name = `${round.name || 'root'}-${index}`;
  return copy;
}

/**
 * Hide opponent's poison king (70 VP card) during evaluation
 */
export function hidePoison(round: any, playerColor: Color): void {
  if (!round) return;

  const opponentColor = playerColor === Color.Red ? Color.Black : Color.Red;

  // Handle round.columns if it exists
  if (round.columns && Array.isArray(round.columns)) {
    round.columns.forEach((column: any) => {
      if (!column) return;

      if (column.positions && Array.isArray(column.positions)) {
        column.positions.forEach((position: any) => {
          if (!position || !position.card) return;

          if (position.card.color === opponentColor && position.card.victoryPoints === 70) {
            // Make it look like a regular king (10 VP)
            position.card.victoryPoints = 10;
          }
        });
      }

      // Check staked card
      if (column.stakedCard &&
          column.stakedCard.color === opponentColor &&
          column.stakedCard.victoryPoints === 70) {
        column.stakedCard.victoryPoints = 10;
      }
    });
  }
}
