import { CardEvaluation } from '../services/cardEvaluation';

describe('CardEvaluation Debug', () => {
  beforeAll(() => {
    CardEvaluation.enableDebug();
  });

  afterAll(() => {
    CardEvaluation.disableDebug();
  });

  describe('stake handling debug', () => {
    it('debug stake stays with owner on win', () => {
      console.log('\nDEBUG: stake stays with owner on win');
      const result = CardEvaluation.getWinningHand([5, 5], [2], 2, false);
      console.log('Result:', result);
    });

    it('debug breaks tie with high card', () => {
      console.log('\nDEBUG: breaks tie with high card');
      const result = CardEvaluation.getWinningHand(
        [2, 2, 9], // pair + 9
        [3, 3, 8], // pair + 8
        10,
        true
      );
      console.log('Result:', result);
    });

    it('debug incorporates stake in high card comparison', () => {
      console.log('\nDEBUG: incorporates stake in high card');
      const result = CardEvaluation.getWinningHand(
        [2, 3], // no combinations
        [4, 5], // no combinations
        10,
        true // stake belongs to hand1
      );
      console.log('Result:', result);
    });
  });
});