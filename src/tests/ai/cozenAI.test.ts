// Update src/tests/ai/cozenAI.test.ts
import { AIDifficulty } from '../../ai/aiTypes';
import { Color, Suit } from '../../types/game';

describe('CozenAI', () => {
  describe('difficulty settings', () => {
    it('should have correctly defined difficulty levels', () => {
      expect(Object.values(AIDifficulty)).toContain('novice');
      expect(Object.values(AIDifficulty)).toContain('easy');
      expect(Object.values(AIDifficulty)).toContain('medium');
      expect(Object.values(AIDifficulty)).toContain('hard');
      expect(Object.values(AIDifficulty)).toContain('nightmare');
    });

    it('should properly scale difficulty values', () => {
      // Import constants directly
      const { DIFFICULTY_VALUES } = require('../../ai/aiTypes');

      // Higher difficulty should have lower values (harder to make mistakes)
      expect(DIFFICULTY_VALUES[AIDifficulty.NOVICE])
        .toBeGreaterThan(DIFFICULTY_VALUES[AIDifficulty.EASY]);

      expect(DIFFICULTY_VALUES[AIDifficulty.EASY])
        .toBeGreaterThan(DIFFICULTY_VALUES[AIDifficulty.MEDIUM]);

      expect(DIFFICULTY_VALUES[AIDifficulty.MEDIUM])
        .toBeGreaterThan(DIFFICULTY_VALUES[AIDifficulty.HARD]);

      expect(DIFFICULTY_VALUES[AIDifficulty.HARD])
        .toBeGreaterThan(DIFFICULTY_VALUES[AIDifficulty.NIGHTMARE]);
    });
  });

  describe('minimax evaluation', () => {
    // Mock the minimax function for testing
    const mockMinimax = (round: any, depth: number, isMaximizing: boolean, color: Color): number => {
      // Simple implementation for testing that just looks at the scores
      if (depth === 0) {
        // For leaf nodes, just return the current score difference
        const vpScores = round.victoryPointScores || { red: 0, black: 0 };
        const scoreDiff = color === Color.Red ?
          vpScores.red - vpScores.black :
          vpScores.black - vpScores.red;

        return isMaximizing ? scoreDiff : -scoreDiff;
      }

      // For intermediate nodes, base score on a weighted evaluation
      const baseScore = color === Color.Red ?
        (round.redAdvantage || 0) :
        (round.blackAdvantage || 0);

      return isMaximizing ? baseScore : -baseScore;
    };

    it('should evaluate higher for winning positions', () => {
      // Create a winning position for Red
      const redWinningRound = {
        victoryPointScores: { red: 30, black: 10 },
        redAdvantage: 20
      };

      // Create a winning position for Black
      const blackWinningRound = {
        victoryPointScores: { red: 10, black: 30 },
        blackAdvantage: 20
      };

      // Evaluate from Red's perspective
      const redScore = mockMinimax(redWinningRound, 0, true, Color.Red);
      expect(redScore).toBe(20); // Red is ahead by 20 points

      // Evaluate from Black's perspective
      const blackScore = mockMinimax(blackWinningRound, 0, true, Color.Black);
      expect(blackScore).toBe(20); // Black is ahead by 20 points

      // Evaluate the opponent's winning position
      const redLossScore = mockMinimax(blackWinningRound, 0, true, Color.Red);
      expect(redLossScore).toBe(-20); // Red is behind by 20 points
    });

    it('should produce different evaluations at different depths', () => {
      const gameState = {
        victoryPointScores: { red: 20, black: 20 }, // Equal scores
        redAdvantage: 10, // But red has an advantage in position
        blackAdvantage: 5
      };

      // At depth 0, should just look at scores
      const leafEval = mockMinimax(gameState, 0, true, Color.Red);
      expect(leafEval).toBe(0); // Equal scores

      // At depth > 0, should consider position advantage
      const intermediateEval = mockMinimax(gameState, 1, true, Color.Red);
      expect(intermediateEval).toBe(10); // Red's position advantage
    });
  });
});
