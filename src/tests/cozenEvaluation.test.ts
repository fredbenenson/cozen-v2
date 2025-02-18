// src/tests/cozenEvaluation.test.ts

import { CozenEvaluation } from '../services/cozenEvaluation';

describe('CozenEvaluation', () => {
  describe('getWinningHand', () => {
    it('handles basic single card comparisons', () => {
      // Single card vs no cards
      let result = CozenEvaluation.getWinningHand([1], [], 10, true);
      expect(result?.hand1Wins).toBe(true);

      // No cards vs single card
      result = CozenEvaluation.getWinningHand([], [1], 10, true);
      expect(result?.hand1Wins).toBe(false);

      // Higher card vs lower card
      result = CozenEvaluation.getWinningHand([2], [1], 10, true);
      expect(result?.hand1Wins).toBe(true);

      // Lower card vs higher card
      result = CozenEvaluation.getWinningHand([1], [2], 10, true);
      expect(result?.hand1Wins).toBe(false);

      // Equal cards should tie
      result = CozenEvaluation.getWinningHand([1], [1], 10, true);
      expect(result).toBeNull();
    });

    it('handles runs correctly', () => {
      // Two card run vs no run
      let result = CozenEvaluation.getWinningHand([1, 2], [1, 3], 10, true);
      expect(result?.hand1Wins).toBe(true);

      // Longer run beats shorter run
      result = CozenEvaluation.getWinningHand([1, 2, 3], [1, 2], 10, true);
      expect(result?.hand1Wins).toBe(true);

      // Higher run beats lower run
      result = CozenEvaluation.getWinningHand([7, 8, 9], [1, 2, 3], 10, true);
      expect(result?.hand1Wins).toBe(true);
    });

    it('handles pairs correctly', () => {
      // Pair beats no pair
      let result = CozenEvaluation.getWinningHand([1, 1], [1, 2], 10, true);
      expect(result?.hand1Wins).toBe(true);

      // Higher pair beats lower pair
      result = CozenEvaluation.getWinningHand([10, 10], [1, 1], 5, true);
      expect(result?.hand1Wins).toBe(true);

      // Equal pairs should tie
      result = CozenEvaluation.getWinningHand([5, 5], [5, 5], 10, true);
      expect(result).toBeNull();
    });

    it('handles stake cards correctly', () => {
      // Stake creates winning pair
      let result = CozenEvaluation.getWinningHand([5], [], 5, true);
      expect(result?.hand1Wins).toBe(true);

      // Stake extends run
      result = CozenEvaluation.getWinningHand([3, 4], [1, 2], 5, true);
      expect(result?.hand1Wins).toBe(true);

      // Stake goes to jail when losing hand claims it
      result = CozenEvaluation.getWinningHand([1, 2], [3, 4], 5, true);
      expect(result?.hand1Wins).toBe(false);
      expect(result?.stakeGoesToJail).toBe(true);
      expect(result?.jailHand).toContain(5);
    });
  });

  describe('evaluateHand', () => {
    it('calculates hand values correctly', () => {
      // Empty hand
      let result = CozenEvaluation.evaluateHand([], 10);
      expect(result.value).toBe(0);

      // Single card
      result = CozenEvaluation.evaluateHand([1], 10);
      expect(result.value).toBe(0);

      // Pair
      result = CozenEvaluation.evaluateHand([5, 5], 10);
      expect(result.value).toBe(3);

      // Run
      result = CozenEvaluation.evaluateHand([1, 2, 3], 10);
      expect(result.value).toBe(3);

      // Run with stake
      result = CozenEvaluation.evaluateHand([1, 2], 3);
      expect(result.value).toBe(3);
      expect(result.includesStake).toBe(true);
    });

    it('handles aces correctly', () => {
      // Ace high
      let result = CozenEvaluation.evaluateHand([14], 10);
      expect(result.highCardList[0]).toBe(14);

      // Ace low in run
      result = CozenEvaluation.evaluateHand([14, 2], 3);
      expect(result.value).toBe(3); // Run of A,2,3
      expect(result.includesStake).toBe(true);
    });
  });
});