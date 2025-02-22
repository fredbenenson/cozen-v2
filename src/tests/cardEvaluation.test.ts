import { CardEvaluation } from '../services/cardEvaluation';

describe('CardEvaluation', () => {
  describe('evaluateHand', () => {
    it('handles empty hands', () => {
      const result = CardEvaluation.evaluateHand([], 10);
      expect(result.strength).toBe(0);
      expect(result.highCards).toEqual([]);
      expect(result.includesStake).toBe(false);
    });

    it('handles single card hands', () => {
      const result = CardEvaluation.evaluateHand([5], 10);
      expect(result.strength).toBe(0);
      expect(result.highCards).toEqual([5]);
      expect(result.includesStake).toBe(false);
    });

    describe('pairs', () => {
      it('scores basic pairs', () => {
        const result = CardEvaluation.evaluateHand([5, 5], 10);
        expect(result.strength).toBe(3);
      });

      it('scores multiple pairs', () => {
        const result = CardEvaluation.evaluateHand([5, 5, 7, 7], 10);
        expect(result.strength).toBe(6);
      });

      it('incorporates stake into pair', () => {
        const result = CardEvaluation.evaluateHand([5], 5);
        expect(result.strength).toBe(3);
        expect(result.includesStake).toBe(true);
      });
    });

    describe('runs', () => {
      it('scores basic runs', () => {
        const result = CardEvaluation.evaluateHand([3, 4, 5], 10);
        expect(result.strength).toBe(3);
      });

      it('scores multiple runs but only counts longest', () => {
        const result = CardEvaluation.evaluateHand([2, 3, 4, 7, 8], 10);
        expect(result.strength).toBe(3); // Only counts 2,3,4
      });

      it('incorporates stake into run', () => {
        const result = CardEvaluation.evaluateHand([3, 4], 5);
        expect(result.strength).toBe(3);
        expect(result.includesStake).toBe(true);
      });

      it('handles ace high runs', () => {
        const result = CardEvaluation.evaluateHand([13, 14], 12); // K,A + Q stake
        expect(result.strength).toBe(3);
        expect(result.includesStake).toBe(true);
      });

      it('handles ace low runs', () => {
        const result = CardEvaluation.evaluateHand([2, 14], 3); // 2,A + 3 stake
        expect(result.strength).toBe(3);
        expect(result.includesStake).toBe(true);
      });
    });
  });

  describe('getWinningHand', () => {
    describe('basic comparisons', () => {
      it('empty hand loses to any hand', () => {
        const result = CardEvaluation.getWinningHand([], [2], 10, true);
        expect(result?.hand1Wins).toBe(false);
      });

      it('higher single card wins', () => {
        const result = CardEvaluation.getWinningHand([8], [5], 10, true);
        expect(result?.hand1Wins).toBe(true);
      });

      it('equal hands result in tie', () => {
        const result = CardEvaluation.getWinningHand([5], [5], 10, true);
        expect(result).toBeNull();
      });
    });

    describe('pairs vs runs', () => {
      it('pair beats run of two', () => {
        const result = CardEvaluation.getWinningHand([5, 5], [7, 8], 10, true);
        expect(result?.hand1Wins).toBe(true);
      });

      it('run of four beats pair', () => {
        const result = CardEvaluation.getWinningHand([5, 5], [4, 5, 6, 7], 10, true);
        expect(result?.hand1Wins).toBe(false);
      });
    });

    describe('stake card handling', () => {
      it('stake forms winning pair', () => {
        const result = CardEvaluation.getWinningHand([5], [6], 5, true);
        expect(result?.hand1Wins).toBe(true);
      });

      it('stake goes to jail when its owner loses', () => {
        const result = CardEvaluation.getWinningHand([2], [5, 5], 2, true);
        expect(result?.stakeGoesToJail).toBe(true);
        expect(result?.jailCards).toContain(2);
      });

      it('stake stays with owner on win', () => {
        const result = CardEvaluation.getWinningHand([5, 5], [2], 2, false);
        expect(result?.stakeGoesToJail).toBe(false);
      });
    });

    describe('complex scenarios', () => {
      it('handles multiple pairs vs long run', () => {
        const result = CardEvaluation.getWinningHand(
          [5, 5, 7, 7], // 6 strength
          [3, 4, 5, 6, 7], // 5 strength
          10,
          true
        );
        expect(result?.hand1Wins).toBe(true);
      });

      it('breaks tie with high card', () => {
        const result = CardEvaluation.getWinningHand(
          [2, 2, 9], // pair + 9
          [3, 3, 8], // pair + 8
          10,
          true
        );
        expect(result?.hand1Wins).toBe(true);
        expect(result?.winningCard).toBe(9);
      });

      it('incorporates stake in high card comparison', () => {
        const result = CardEvaluation.getWinningHand(
          [2, 3], // no combinations
          [4, 5], // no combinations
          10,
          true // stake belongs to hand1
        );
        expect(result?.hand1Wins).toBe(true);
        expect(result?.winningCard).toBe(10);
      });
    });
  });
});
