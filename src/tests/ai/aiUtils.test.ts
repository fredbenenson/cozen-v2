import { rpois, deduplicateHands } from '../../ai/aiUtils';
import { AIMove } from '../../ai/aiTypes';

describe('AI Utilities', () => {
  describe('rpois', () => {
    it('generates a Poisson-distributed random number', () => {
      const result = rpois(1.0);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('deduplicateHands', () => {
    it('removes duplicate moves', () => {
      // Create some sample moves with duplicates
      const moves: AIMove[] = [
        {
          cards: ['red_5_hearts'],
          column: 2,
          didStake: true,
          isStake: true
        },
        {
          cards: ['red_5_hearts'],
          column: 2,
          didStake: true,
          isStake: true
        },
        {
          cards: ['red_7_hearts'],
          column: 3,
          didStake: true,
          isStake: true
        }
      ];

      const dedupedMoves = deduplicateHands(moves);

      // Should remove one duplicate
      expect(dedupedMoves.length).toBe(2);

      // Check that both unique column/card combinations are preserved
      const column2Moves = dedupedMoves.filter(m => m.column === 2);
      const column3Moves = dedupedMoves.filter(m => m.column === 3);

      expect(column2Moves.length).toBe(1);
      expect(column3Moves.length).toBe(1);
    });
  });
});
