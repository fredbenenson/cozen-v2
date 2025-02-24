import _ from 'lodash';
import { MoveOption } from './aiTypes';
import { CardEvaluation } from '../services/cardEvaluation';

/**
 * Class for generating and evaluating possible moves
 */
export class AIMoveGenerator {
  /**
   * Generate all possible moves for the current round
   */
  public static generatePossibleMoves(round: any): MoveOption[] {
    // Get wager moves (playing cards to columns)
    const wagers = this.generateWagerMoves(round);

    // Get stake moves (if player has stakes available)
    const stakes = this.generateStakeMoves(round);

    // Combine and sort
    return _.chain(wagers.concat(stakes))
      .sortBy((m: MoveOption) => m.strength || 0) // Sort by strength first
      .sortBy((m: MoveOption) => -(m.cards.length)) // Then by number of cards (descending)
      .value();
  }

  /**
   * Generate all possible stake moves
   */
  private static generateStakeMoves(round: any): MoveOption[] {
    if (!round.activePlayer || !round.activePlayer.availableStakes || round.activePlayer.availableStakes.length === 0) {
      return [];
    }

    // Get first available stake position
    const stakeColumn = round.activePlayer.availableStakes[0];

    // Create a stake move for each card in hand
    return round.activePlayer.hand.map((card: any) => {
      return {
        cards: [card.id],
        column: stakeColumn,
        isStake: true,
        strength: 0,
        value: card.victoryPoints
      };
    });
  }

  /**
   * Generate all possible wager moves
   */
  private static generateWagerMoves(round: any): MoveOption[] {
    // Check for staked columns
    const stakedColumns = this.getStakedColumns(round);
    if (stakedColumns.length === 0) {
      return [];
    }

    // Generate all valid combinations from player's hand
    const allMoves: MoveOption[] = [];

    stakedColumns.forEach((column: number) => {
      // Get all permutations of cards from hand
      const permutations = this.generateHandPermutations(round.activePlayer.hand);

      // For each permutation, evaluate its strength
      permutations.forEach((cardSet: any[]) => {
        if (cardSet.length === 0) return;

        // Get staked card
        const stakedCard = round.columns[column].stakedCard;
        if (!stakedCard) return;

        // Calculate strength of this hand
        const stakeNumber = stakedCard.owner === round.activePlayer ? stakedCard.number : -1;
        const score = CardEvaluation.evaluateHand(
          cardSet.map((c: any) => c.number),
          stakeNumber
        );

        // Create the move
        allMoves.push({
          cards: cardSet.map((c: any) => c.id),
          column,
          isStake: false,
          strength: score.strength,
          value: cardSet.reduce((sum: number, c: any) => sum + c.victoryPoints, 0)
        });
      });
    });

    return allMoves;
  }

  /**
   * Get all columns that have staked cards
   */
  private static getStakedColumns(round: any): number[] {
    if (!round.columns || !Array.isArray(round.columns)) {
      return [];
    }

    return round.columns
      .map((column: any, index: number) => column.stakedCard ? index : -1)
      .filter((index: number) => index !== -1);
  }

  /**
   * Generate all permutations of cards from a hand
   */
  public static generateHandPermutations(hand: any[]): any[][] {
    const result: any[][] = [];

    // Function to recursively generate combinations
    const combine = (start: any[], rest: any[]): void => {
      if (start.length > 0) {
        result.push(start);
      }

      for (let i = 0; i < rest.length; i++) {
        combine([...start, rest[i]], rest.slice(i + 1));
      }
    };

    // Start with empty set and all cards
    if (hand && Array.isArray(hand)) {
      combine([], hand);
    }

    // Remove empty set
    return result.filter(set => set.length > 0);
  }
}
