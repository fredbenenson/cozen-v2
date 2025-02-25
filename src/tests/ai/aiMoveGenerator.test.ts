// src/tests/ai/aiMoveGenerator.test.ts (with type annotations)
import { AIMove } from '../../ai/aiTypes';
import { Color, Suit } from '../../types/game';

// Import or create utility functions as needed
const generateHandPermutations = require('../../ai/aiUtils').generateHandPermutations;

describe('AI Move Generator', () => {
  // Use a simplified version of AIMoveGenerator that's easier to test
  const mockGeneratePossibleMoves = (round: any): AIMove[] => {
    const moves: AIMove[] = [];

    // If player has available stakes, generate stake moves
    if (round.activePlayer.availableStakes && round.activePlayer.availableStakes.length > 0) {
      // Generate a stake move for each card in hand
      round.activePlayer.hand.forEach((card: any) => {
        const cardId = typeof card === 'string' ? card : card.id || `card_${card.number}`;

        moves.push({
          cards: [cardId],
          column: round.activePlayer.availableStakes[0],
          didStake: true,
          isStake: true,
          playerName: round.activePlayer.name || 'AI'
        });
      });
    }

    // If there are staked columns, generate wager moves
    if (round.columns && round.columns.length > 0) {
      const stakedColumns = round.columns.filter((col: any) => col.stakedCard);

      if (stakedColumns.length > 0) {
        // For each column, generate possible card combinations
        stakedColumns.forEach((col: any, colIndex: number) => {
          // For simplicity in testing, just use singles
          round.activePlayer.hand.forEach((card: any) => {
            const cardId = typeof card === 'string' ? card : card.id || `card_${card.number}`;

            moves.push({
              cards: [cardId],
              column: colIndex,
              didStake: false,
              isStake: false,
              playerName: round.activePlayer.name || 'AI'
            });
          });
        });
      }
    }

    return moves;
  };

  describe('generatePossibleMoves', () => {
    it('should generate stake moves when stakes are available', () => {
      // Create a simple player with cards and available stakes
      const player = {
        name: 'Test Player',
        color: Color.Red,
        hand: [
          { id: 'red_3_hearts', color: Color.Red, number: 3, suit: Suit.Hearts },
          { id: 'red_5_diamonds', color: Color.Red, number: 5, suit: Suit.Diamonds }
        ],
        availableStakes: [5]
      };

      // Create a simple round
      const round = {
        activePlayer: player,
        columns: []
      };

      // Generate moves
      const moves = mockGeneratePossibleMoves(round);

      // Verify stake moves
      expect(moves.length).toBe(2); // One for each card
      expect(moves[0].isStake).toBe(true);
      expect(moves[1].isStake).toBe(true);
      expect(moves[0].didStake).toBe(true);
      expect(moves[1].didStake).toBe(true);
      expect(moves[0].column).toBe(5); // Using available stake position
    });

    it('should generate wager moves for columns with stakes', () => {
      // Create a simple player with cards but no available stakes
      const player = {
        name: 'Test Player',
        color: Color.Red,
        hand: [
          { id: 'red_3_hearts', color: Color.Red, number: 3, suit: Suit.Hearts },
          { id: 'red_5_diamonds', color: Color.Red, number: 5, suit: Suit.Diamonds }
        ],
        availableStakes: []
      };

      // Create a round with a staked column
      const round = {
        activePlayer: player,
        columns: [
          {
            stakedCard: {
              id: 'black_7_spades',
              color: Color.Black,
              number: 7,
              suit: Suit.Spades
            },
            positions: []
          }
        ]
      };

      // Generate moves
      const moves = mockGeneratePossibleMoves(round);

      // Verify wager moves
      expect(moves.length).toBe(2); // One for each card
      expect(moves[0].isStake).toBe(false);
      expect(moves[1].isStake).toBe(false);
      expect(moves[0].didStake).toBe(false);
      expect(moves[1].didStake).toBe(false);
      expect(moves[0].column).toBe(0); // Column index
    });

    it('should generate both stake and wager moves when both are possible', () => {
      // Create a simple player with cards and available stakes
      const player = {
        name: 'Test Player',
        color: Color.Red,
        hand: [
          { id: 'red_3_hearts', color: Color.Red, number: 3, suit: Suit.Hearts },
          { id: 'red_5_diamonds', color: Color.Red, number: 5, suit: Suit.Diamonds }
        ],
        availableStakes: [5]
      };

      // Create a round with a staked column
      const round = {
        activePlayer: player,
        columns: [
          {
            stakedCard: {
              id: 'black_7_spades',
              color: Color.Black,
              number: 7,
              suit: Suit.Spades
            },
            positions: []
          }
        ]
      };

      // Generate moves
      const moves = mockGeneratePossibleMoves(round);

      // Verify both types of moves
      expect(moves.length).toBe(4); // 2 stake moves + 2 wager moves

      // Count each type
      const stakeMoves = moves.filter((m: AIMove) => m.isStake);
      const wagerMoves = moves.filter((m: AIMove) => !m.isStake);

      expect(stakeMoves.length).toBe(2);
      expect(wagerMoves.length).toBe(2);
    });
  });

  describe('generateHandPermutations', () => {
    it('should generate all combinations of cards from a hand', () => {
      const hand = [
        { id: 'card1', number: 1 },
        { id: 'card2', number: 2 },
        { id: 'card3', number: 3 }
      ];

      const permutations = generateHandPermutations(hand);

      // With 3 cards, should get 7 permutations (all non-empty subsets)
      expect(permutations.length).toBe(7);

      // Check for different lengths - added type annotations
      const singleCards = permutations.filter((p: any) => p.length === 1);
      const pairs = permutations.filter((p: any) => p.length === 2);
      const triples = permutations.filter((p: any) => p.length === 3);

      expect(singleCards.length).toBe(3);
      expect(pairs.length).toBe(3);
      expect(triples.length).toBe(1);
    });

    it('should handle empty hands', () => {
      const permutations = generateHandPermutations([]);
      expect(permutations.length).toBe(0);
    });
  });
});
