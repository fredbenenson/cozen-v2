// src/tests/ai/aiEvaluation.test.ts (simplified)
import { AIEvaluation } from '../../ai/aiEvaluation';
import { Color } from '../../types/game';

describe('AIEvaluation', () => {
  describe('evaluateState', () => {
    it('calculates victory point difference correctly', () => {
      // Create a minimal mock round
      const mockRound = {
        victoryPointScores: {
          red: 20,
          black: 30
        }
      };

      // Test from red player's perspective
      const redScore = AIEvaluation.evaluateState(mockRound, Color.Red);

      // Since black has more points, red's score should be negative
      expect(redScore).toBe(-10);

      // Test from black player's perspective
      const blackScore = AIEvaluation.evaluateState(mockRound, Color.Black);

      // Since black has more points, black's score should be positive
      expect(blackScore).toBe(10);
    });

    it('handles undefined victory point scores', () => {
      const emptyRound = {};

      // Should handle missing victoryPointScores gracefully
      const score = AIEvaluation.evaluateState(emptyRound, Color.Red);
      expect(score).toBe(0);
    });
  });
});
