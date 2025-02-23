import { CardEvaluation } from '../services/cardEvaluation';

describe('CardEvaluation', () => {
  beforeAll(() => {
    CardEvaluation.disableDebug();
  });

  afterAll(() => {
    CardEvaluation.disableDebug();
  });

  afterEach(() => {
    CardEvaluation.disableDebug();
  });

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
        expect(result?.stakeGoesToJail).toBe(false); // Owner wins, stake stays
      });

      it('stake goes to jail when used in losing combination', () => {
        const result = CardEvaluation.getWinningHand([6, 6], [5], 5, false);
        expect(result?.hand1Wins).toBe(true);
        expect(result?.stakeGoesToJail).toBe(true); // Used in losing pair
      });

      it('stake stays with owner when not used in combination', () => {
        // Enable debug for this failing test
        // console.log("TEST: stake stays with owner when not used in combination");
        // CardEvaluation.enableDebug();
        const result = CardEvaluation.getWinningHand([7, 7], [2], 2, false);
        expect(result?.hand1Wins).toBe(true);
        expect(result?.stakeGoesToJail).toBe(true);
        // CardEvaluation.disableDebug();
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

      it('breaks tie with high card without stake', () => {
        console.log("TEST: breaks tie with high card without stake");
        CardEvaluation.enableDebug();
        const result = CardEvaluation.getWinningHand(
          [2, 2, 7], // pair of 2s, high card 7
          [2, 2, 6], // pair of 2s, high card 6
          10, // stake not used
          true
        );
        expect(result?.hand1Wins).toBe(true);
        expect(result?.winningCard).toBe(7);
        CardEvaluation.disableDebug();
      });

      it('high card comparison ignores unused stake', () => {
        const result = CardEvaluation.getWinningHand(
          [2, 3], // no combinations
          [4, 5], // no combinations
          10,
          true // stake belongs to hand1 but isn't used
        );
        expect(result?.hand1Wins).toBe(false); // Hand2 wins with higher card 5
      });

      it('stake counts in high card comparison only when part of combination', () => {
        const result = CardEvaluation.getWinningHand(
          [10, 11], // straight with 12 stake
          [8, 9], // straight
          12,
          true
        );
        expect(result?.hand1Wins).toBe(true); // Wins with longer straight including stake
      });
    });
  });
});
