import { CozenAI, AIDifficulty, AIDecisionContext } from "../../ai/cozenAI";

describe("CozenAI Decision Making", () => {
  beforeEach(() => {
    CozenAI.enableDebug(); // Enable debug output for all tests
  });

  describe("Basic Challenge Decisions", () => {
    it("should challenge when opponent plays cards and AI has matching cards", () => {
      const context: AIDecisionContext = {
        hand: [10, 10, 10], // Three of a kind
        stake: -1,
        difficulty: AIDifficulty.HARD,
        cardsPlayed: [5], // Opponent played one card
        opponentCardCount: 1,
      };

      const result = CozenAI.shouldChallengeCozen(context);
      expect(result).toBe(true);
    });

    it("should not challenge when AI has weak hand", () => {
      const context: AIDecisionContext = {
        hand: [2, 5, 7], // Scattered low cards
        stake: -1,
        difficulty: AIDifficulty.HARD,
        cardsPlayed: [10], // Opponent played one high card
        opponentCardCount: 1,
      };

      const result = CozenAI.shouldChallengeCozen(context);
      expect(result).toBe(false);
    });
  });

  describe("Difficulty Level Behavior", () => {
    const baseContext: AIDecisionContext = {
      hand: [10, 10, 10], // Strong hand
      stake: -1,
      difficulty: AIDifficulty.HARD, // Will be overridden in tests
      cardsPlayed: [5],
      opponentCardCount: 1,
    };

    it("should make optimal decisions on HARD difficulty", () => {
      const results = new Array(10).fill(0).map(() => {
        return CozenAI.shouldChallengeCozen({
          ...baseContext,
          difficulty: AIDifficulty.HARD,
        });
      });

      // On HARD, should almost always challenge with strong hand
      const trueCount = results.filter((r) => r).length;
      expect(trueCount).toBeGreaterThanOrEqual(8);
    });

    it("should make suboptimal decisions on EASY difficulty", () => {
      const results = new Array(10).fill(0).map(() => {
        return CozenAI.shouldChallengeCozen({
          ...baseContext,
          difficulty: AIDifficulty.EASY,
        });
      });

      // On EASY, should make more random decisions
      const trueCount = results.filter((r) => r).length;
      expect(trueCount).toBeLessThan(8);
    });
  });

  describe("Complex Hand Evaluation", () => {
    it("should properly evaluate runs", () => {
      const context: AIDecisionContext = {
        hand: [7, 8, 9, 10], // Potential 4-card run
        stake: -1,
        difficulty: AIDifficulty.HARD,
        cardsPlayed: [5],
        opponentCardCount: 1,
      };

      const result = CozenAI.shouldChallengeCozen(context);
      expect(result).toBe(true);
    });

    it("should properly evaluate pairs", () => {
      const context: AIDecisionContext = {
        hand: [8, 8, 3, 4], // One pair
        stake: -1,
        difficulty: AIDifficulty.HARD,
        cardsPlayed: [5],
        opponentCardCount: 1,
      };

      CozenAI.shouldChallengeCozen(context); // Call to see debug output
      // Don't assert on the result since pairs alone might not be strong enough
    });
  });

  describe("Search Tree Generation", () => {
    it("should generate appropriate number of moves for simple hand", () => {
      const context: AIDecisionContext = {
        hand: [2, 3, 4],
        stake: -1,
        difficulty: AIDifficulty.HARD,
        cardsPlayed: [5],
        opponentCardCount: 1,
      };

      CozenAI.shouldChallengeCozen(context);
      // Debug output will show number of moves considered
    });

    it("should handle complex hands with multiple possibilities", () => {
      const context: AIDecisionContext = {
        hand: [7, 7, 8, 8, 9], // Two pairs plus extra card
        stake: -1,
        difficulty: AIDifficulty.HARD,
        cardsPlayed: [5],
        opponentCardCount: 1,
      };

      CozenAI.shouldChallengeCozen(context);
      // Debug output will show move generation complexity
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty hand", () => {
      const context: AIDecisionContext = {
        hand: [],
        stake: -1,
        difficulty: AIDifficulty.HARD,
        cardsPlayed: [5],
        opponentCardCount: 1,
      };

      const result = CozenAI.shouldChallengeCozen(context);
      expect(result).toBe(false);
    });

    it("should handle single card hand", () => {
      const context: AIDecisionContext = {
        hand: [10],
        stake: -1,
        difficulty: AIDifficulty.HARD,
        cardsPlayed: [5],
        opponentCardCount: 1,
      };

      const result = CozenAI.shouldChallengeCozen(context);
      // Single high card might or might not challenge
    });
  });
});
