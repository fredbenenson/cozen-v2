// src/tests/ai/aiTypes.test.ts
import { AIDifficulty, DIFFICULTY_VALUES, DIFFICULTY_SCALAR } from '../../ai/aiTypes';

describe('AI Types', () => {
  describe('AIDifficulty', () => {
    it('has the expected difficulty levels', () => {
      expect(Object.keys(AIDifficulty)).toEqual([
        'NOVICE', 'EASY', 'MEDIUM', 'HARD', 'NIGHTMARE'
      ]);
    });
  });

  describe('DIFFICULTY_VALUES', () => {
    it('scales difficulty appropriately', () => {
      // Check that difficulties are properly ordered
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
});
