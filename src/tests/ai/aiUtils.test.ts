import {
  generateStakeMoves,
  generateWagerMoves,
  generateCardCombinations,
  evaluateGameState,
  cloneRound,
  poissonRandom,
  flagSplitPairs,
  hidePoison,
  restorePoison
} from '../../ai/aiUtils';
import { Round, Column, Position } from '../../types/round';
import { Player } from '../../types/player';
import { Card, Color, Suit } from '../../types/game';
import { AIMove } from '../../ai/aiTypes';
import { StakeService } from '../../services/stakeService';

// Helper to create a mock card
const mockCard = (id: string, number: number, color: string, victoryPoints: number = number): Card => ({
  id,
  number,
  color: color as Color,
  suit: color === Color.Red ? Suit.Hearts : Suit.Spades,
  victoryPoints,
  played: false
});

// Helper to create a mock player
const mockPlayer = (color: string, cards: Card[]): Player => ({
  color: color as Color,
  name: `${color} player`,
  hand: [...cards],
  jail: [],
  cards: [], // deck
  victory_points: 0,
  availableStakes: color === Color.Red ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4],
  stake_offset: color === Color.Red ? 1 : -1,
  drawUp: jest.fn(),
  reset: jest.fn()
});

// Helper to create a mock position
const mockPosition = (player: Player, row: number, col: number): Position => ({
  owner: player,
  n: row * 10 + col,
  coord: [row, col],
  card: undefined
});

// Helper to create a mock column
const mockColumn = (index: number, redPlayer: Player, blackPlayer: Player): Column => {
  const positions = [];

  // Create positions for the column (typically 3 rows)
  for (let row = 0; row < 3; row++) {
    positions.push(mockPosition(row < 2 ? blackPlayer : redPlayer, row, index));
  }

  return {
    positions,
    stakedCard: null as unknown as Card | undefined
  };
};

// Helper to create a mock round
const mockRound = (redPlayer: Player, blackPlayer: Player): Round => {
  const round = {
    redPlayer,
    blackPlayer,
    activePlayer: redPlayer,
    inactivePlayer: blackPlayer,
    firstRound: true,
    state: 'running',
    board: [],
    columns: [],
    turn: 1,
    cardsJailed: 0,
    victoryPointScores: {
      red: 0,
      black: 0
    },
    firstStakes: {
      red: [],
      black: []
    }
  } as Round;

  // Create the board grid (3x10)
  round.board = Array(3).fill(null).map((_, row) =>
    Array(10).fill(null).map((_, col) =>
      mockPosition(row < 2 ? blackPlayer : redPlayer, row, col)
    )
  );

  // Set up columns
  round.columns = Array(10).fill(null).map((_, index) =>
    mockColumn(index, redPlayer, blackPlayer)
  );

  return round;
};

describe('AI Utility Functions', () => {
  describe('generateStakeMoves', () => {
    it('should generate stake moves for each available column and valid card', () => {
      // Create test cards
      const cards = [
        mockCard('r_5_h', 5, Color.Red),
        mockCard('r_10_h', 10, Color.Red),
        mockCard('b_7_s', 7, Color.Black) // Should be filtered out for red player
      ];

      // Create a player with those cards
      const player = mockPlayer(Color.Red, cards);
      
      // Create a round
      const round = mockRound(player, mockPlayer(Color.Black, []));

      // Generate stake moves
      const moves = generateStakeMoves(round, player);

      // Expect moves for each red card (2) * available stake columns
      expect(moves.length).toBe(2 * player.availableStakes.length);

      // Verify moves include only red cards
      moves.forEach(move => {
        // All moves should be stakes
        expect(move.isStake).toBe(true);
        expect(move.didStake).toBe(true);

        // Card ID should be one of the red cards
        expect(['r_5_h', 'r_10_h']).toContain(move.cards[0]);

        // Column should be one of the available stakes for red
        expect(player.availableStakes).toContain(move.column);

        // Score should be set
        expect(typeof move.score).toBe('number');
      });
    });

    it('should return an empty array if no available stakes', () => {
      const player = mockPlayer(Color.Red, [mockCard('r_5_h', 5, Color.Red)]);
      player.availableStakes = [];
      const round = mockRound(player, mockPlayer(Color.Black, []));

      const moves = generateStakeMoves(round, player);
      expect(moves).toEqual([]);
    });
  });

  describe('generateWagerMoves', () => {
    it('should generate wager moves for staked columns', () => {
      // Create test cards
      const redCards = [
        mockCard('r_5_h', 5, Color.Red),
        mockCard('r_6_h', 6, Color.Red),
      ];

      // Create players
      const redPlayer = mockPlayer(Color.Red, redCards);
      const blackPlayer = mockPlayer(Color.Black, []);

      // Create a round with staked columns
      const round = mockRound(redPlayer, blackPlayer);

      // Add stakes to specific columns
      round.columns[2].stakedCard = mockCard('r_7_h', 7, Color.Red);
      round.columns[5].stakedCard = mockCard('b_9_s', 9, Color.Black);

      // Generate wager moves
      const moves = generateWagerMoves(round, redPlayer);

      // Expect at least some moves to be generated
      expect(moves.length).toBeGreaterThan(0);

      // Verify basic move properties
      moves.forEach(move => {
        // All moves should be wagers, not stakes
        expect(move.isStake).toBe(false);
        expect(move.didStake).toBe(false);

        // Score should be set
        expect(typeof move.score).toBe('number');

        // Verify all cards are from the player's hand
        move.cards.forEach(cardId => {
          expect(redPlayer.hand.map(c => c.id)).toContain(cardId);
        });
      });

      // Check that the moves are only for staked columns
      const columns = moves.map(move => move.column);
      expect(columns.some(col => col === 2 || col === 5)).toBe(true);
    });

    it('should return an empty array if no staked columns', () => {
      const player = mockPlayer(Color.Red, [mockCard('r_5_h', 5, Color.Red)]);
      const round = mockRound(player, mockPlayer(Color.Black, []));

      // Make sure no columns have stakes
      round.columns.forEach(col => col.stakedCard = undefined);

      const moves = generateWagerMoves(round, player);
      expect(moves).toEqual([]);
    });

    // it('should limit combinations by available positions', () => {
    //   // Create test cards for hand
    //   const redCards = [
    //     mockCard('r_1_h', 1, Color.Red),
    //     mockCard('r_2_h', 2, Color.Red),
    //   ];

    //   // Create players
    //   const redPlayer = mockPlayer(Color.Red, redCards);
    //   const blackPlayer = mockPlayer(Color.Black, []);

    //   // Create a round with a staked column
    //   const round = mockRound(redPlayer, blackPlayer);
    //   round.columns[5].stakedCard = mockCard('r_7_h', 7, Color.Red);

    //   // Add cards to the column's positions
    //   const redPositionsInColumn = round.columns[5].positions.filter(
    //     pos => pos.owner.color === Color.Red
    //   );

    //   // Add cards to most of the positions
    //   for (let i = 0; i < redPositionsInColumn.length - 1; i++) {
    //     redPositionsInColumn[i].card = mockCard(`r_${8+i}_h`, 8+i, Color.Red);
    //   }

    //   // Generate wager moves - only one position left, so all moves should be single cards
    //   const moves = generateWagerMoves(round, redPlayer);

    //   // Check if there are any moves for column 2
    //   const movesForColumn2 = moves.filter(move => move.column === 5);

    //   // If we have moves for column 2, they should have just 1 card
    //   if (movesForColumn2.length > 0) {
    //     movesForColumn2.forEach(move => {
    //       expect(move.cards.length).toBeLessThanOrEqual(1);
    //     });
    //   }
    // });
  });

  describe('generateCardCombinations', () => {
    it('should generate all non-empty combinations of cards', () => {
      const cards = [
        mockCard('r_5_h', 5, Color.Red),
        mockCard('r_6_h', 6, Color.Red),
        mockCard('r_7_h', 7, Color.Red),
      ];

      const combinations = generateCardCombinations(cards);

      // For 3 cards, we expect 7 combinations (2^n - 1)
      expect(combinations.length).toBe(7);

      // Should include all individual cards
      expect(combinations).toContainEqual([cards[0]]);
      expect(combinations).toContainEqual([cards[1]]);
      expect(combinations).toContainEqual([cards[2]]);

      // Should include all pairs
      expect(combinations).toContainEqual([cards[0], cards[1]]);
      expect(combinations).toContainEqual([cards[0], cards[2]]);
      expect(combinations).toContainEqual([cards[1], cards[2]]);

      // Should include the full set
      expect(combinations).toContainEqual([cards[0], cards[1], cards[2]]);
    });

    it('should return an empty array for empty input', () => {
      const combinations = generateCardCombinations([]);
      expect(combinations).toEqual([]);
    });
  });

  describe('evaluateGameState', () => {
    it('should calculate score based on victory points difference', () => {
      // Create players with different victory points
      const redPlayer = mockPlayer(Color.Red, []);
      const blackPlayer = mockPlayer(Color.Black, []);
      redPlayer.victory_points = 30;
      blackPlayer.victory_points = 20;

      // Create a round
      const round = mockRound(redPlayer, blackPlayer);

      // Evaluate from red's perspective
      const redScore = evaluateGameState(round, Color.Red);

      // Evaluate from black's perspective
      const blackScore = evaluateGameState(round, Color.Black);

      // Red is ahead by 10 points, so red's score should be positive
      // and black's score should be negative
      expect(redScore).toBeGreaterThan(0);
      expect(blackScore).toBeLessThan(0);

      // The absolute values should be similar (possibly affected by position evaluation)
      expect(Math.abs(redScore - Math.abs(blackScore))).toBeLessThan(10);
    });

    it('should value strong hands higher', () => {
      // Create player with a pair (strong hand)
      const playerWithPair = mockPlayer(Color.Red, [
        mockCard('r_5_h', 5, Color.Red),
        mockCard('r_5_d', 5, Color.Red),
        mockCard('r_7_h', 7, Color.Red),
      ]);

      // Create player with no combinations (weak hand)
      const playerWithNoCombos = mockPlayer(Color.Red, [
        mockCard('r_3_h', 3, Color.Red),
        mockCard('r_5_d', 5, Color.Red),
        mockCard('r_7_h', 7, Color.Red),
      ]);

      // Create rounds for each scenario
      const roundWithPair = mockRound(playerWithPair, mockPlayer(Color.Black, []));
      const roundWithNoCombos = mockRound(playerWithNoCombos, mockPlayer(Color.Black, []));

      // Evaluate both states from red's perspective
      const pairScore = evaluateGameState(roundWithPair, Color.Red);
      const noComboScore = evaluateGameState(roundWithNoCombos, Color.Red);

      // The score with the pair should be higher
      expect(pairScore).toBeGreaterThan(noComboScore);
    });
  });

  describe('cloneRound', () => {
    it('should create a deep copy of the round', () => {
      // Create a round
      const round = mockRound(
        mockPlayer(Color.Red, [mockCard('r_5_h', 5, Color.Red)]),
        mockPlayer(Color.Black, [mockCard('b_7_s', 7, Color.Black)])
      );

      // Clone the round
      const clonedRound = cloneRound(round);

      // Verify it's a different object reference
      expect(clonedRound).not.toBe(round);

      // But has the same structure and values
      expect(clonedRound.redPlayer.color).toBe(round.redPlayer.color);
      expect(clonedRound.blackPlayer.color).toBe(round.blackPlayer.color);
      expect(clonedRound.state).toBe(round.state);

      // Verify it's a deep copy by modifying the clone and checking the original
      clonedRound.state = 'complete';
      expect(round.state).toBe('running');

      clonedRound.redPlayer.victory_points = 50;
      expect(round.redPlayer.victory_points).toBe(0);
    });
  });

  describe('poissonRandom', () => {
    it('should return non-negative integers', () => {
      for (let i = 0; i < 100; i++) {
        const value = poissonRandom(1.0);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    });

    it('should have a mean approximately equal to lambda', () => {
      const lambda = 2.5;
      const samples = 1000;
      let sum = 0;

      for (let i = 0; i < samples; i++) {
        sum += poissonRandom(lambda);
      }

      const mean = sum / samples;

      // Allow 10% margin of error due to randomness
      expect(mean).toBeGreaterThan(lambda * 0.9);
      expect(mean).toBeLessThan(lambda * 1.1);
    });
  });

  describe('flagSplitPairs', () => {
    it('should identify moves that would split pairs', () => {
      // Create cards with a pair of 5s
      const cards = [
        mockCard('r_5_h', 5, Color.Red),
        mockCard('r_5_d', 5, Color.Red),
        mockCard('r_7_h', 7, Color.Red),
      ];

      // Create moves
      const moves: AIMove[] = [
        {
          cards: ['r_5_h'],
          column: 0,
          didStake: true,
          isStake: true,
        },
        {
          cards: ['r_7_h'],
          column: 1,
          didStake: true,
          isStake: true,
        }
      ];

      // Flag split pairs
      flagSplitPairs(moves, cards);

      // The move with the 5 should be flagged
      expect(moves[0].splitPair).toBe(true);

      // The move with the 7 should not be flagged
      expect(moves[1].splitPair).toBeFalsy();
    });
  });

  describe('hidePoison and restorePoison', () => {
    it('should temporarily hide high-value Kings', () => {
      // Create a player with a poison King (70 points)
      const blackCards = [
        mockCard('b_13_s', 13, Color.Black, 70), // Poison King
        mockCard('b_5_s', 5, Color.Black),
      ];

      const blackPlayer = mockPlayer(Color.Black, blackCards);
      const redPlayer = mockPlayer(Color.Red, []);
      const round = mockRound(redPlayer, blackPlayer);

      // Hide poison from red's perspective
      hidePoison(round, Color.Red);

      // Verify the King's value is temporarily reduced
      expect(blackPlayer.hand[0].victoryPoints).toBe(10);

      // Restore original values
      restorePoison(round, Color.Red);

      // Verify the original value is restored
      expect(blackPlayer.hand[0].victoryPoints).toBe(70);
    });
  });
});
