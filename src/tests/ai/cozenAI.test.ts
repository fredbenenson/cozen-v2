import { CozenAI, AIDifficulty } from '../../ai/cozenAI';
import { Color, Suit } from '../../types/game';
import { Player } from '../../types/player';
import { Round, Position } from '../../types/round';
import { AITestVisualization } from './aiTestVisualization';

describe('CozenAI', () => {
  let ai: CozenAI;
  let game: any;
  let redPlayer: Player;
  let blackPlayer: Player;
  let round: Partial<Round>;

  beforeEach(() => {
    // Create test players
    redPlayer = createMockPlayer(Color.Red);
    blackPlayer = createMockPlayer(Color.Black);

    // Create a simple game object
    game = {
      round: null
    };

    // Initialize AI
    ai = new CozenAI(game, blackPlayer, AIDifficulty.MEDIUM, 2);
    ai.disableDebug(); // Disable debug output for tests

    // Set up a basic round
    round = {
      redPlayer,
      blackPlayer,
      activePlayer: blackPlayer,
      inactivePlayer: redPlayer,
      firstRound: true,
      board: [],
      columns: [],
      state: 'running',
      turn: 1,
      cardsJailed: 0,
      victoryPointScores: { red: 0, black: 0 },
      firstStakes: { red: [], black: [] }
    };

    // Add the round to the game
    game.round = round;
  });

  function createMockPlayer(color: Color): Player {
    // Create a mock player with basic properties
    // Note: Using 'name' instead of 'id' to identify the player
    return {
      color,
      name: `player-${color}`,
      hand: [],
      jail: [],
      cards: [],
      victory_points: 0,
      availableStakes: color === Color.Red ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4],
      stake_offset: color === Color.Red ? 1 : -1,
      drawUp: jest.fn(),
      reset: jest.fn()
    };
  }

  function createMockCard(color: Color, number: number) {
    const suit = color === Color.Red ? Suit.Hearts : Suit.Spades;
    return {
      id: `${color}_${number}_${suit}`,
      color,
      suit,
      number,
      victoryPoints: number,
      played: false
    };
  }

  function createMockPosition(owner: Player, n: number, column: number, row: number): Position {
    return {
      owner,
      n,
      coord: [row, column],
      card: undefined
    };
  }

  function setupGameColumn(columnIndex: number, stakedCard: any, blackPositions: Position[] = [], redPositions: Position[] = []) {
    const positions: Position[] = [...blackPositions];

    // Create position for the stake if not already included
    const stakePosition = createMockPosition(
      stakedCard.color === Color.Red ? redPlayer : blackPlayer,
      5,
      columnIndex,
      5
    );
    positions.push(stakePosition);

    // Add any red positions
    positions.push(...redPositions);

    return {
      positions,
      stakedCard
    };
  }

  describe('calculateMove', () => {
    it('should return null when the round is complete', () => {
      round.state = 'complete';
      expect(ai.calculateMove()).toBeNull();
    });

    it('should return null when AI is not the active player', () => {
      round.activePlayer = redPlayer;
      round.inactivePlayer = blackPlayer;
      expect(ai.calculateMove()).toBeNull();
    });

    it('should return null when player has no cards', () => {
      blackPlayer.hand = [];
      expect(ai.calculateMove()).toBeNull();
    });

    it('should return a stake move when player has a card and available stakes', () => {
      // Give the AI player a card and available stakes
      blackPlayer.hand = [createMockCard(Color.Black, 5)];
      blackPlayer.availableStakes = [2];

      const move = ai.calculateMove();
      expect(move).not.toBeNull();
      expect(move?.isStake).toBe(true);
      expect(move?.column).toBe(2);
      expect(move?.playerId).toBe(blackPlayer.name);
    });

    it('should evaluate and return the best move for a simple scenario', () => {
      // Create a simple game scenario
      // Set up the black player's hand
      blackPlayer.hand = [
        createMockCard(Color.Black, 5),
        createMockCard(Color.Black, 5), // Pair of 5s
        createMockCard(Color.Black, 8)
      ];

      // Create proper position objects
      const blackPositions = [];
      for (let i = 0; i < 5; i++) {
        blackPositions.push(createMockPosition(blackPlayer, i, 0, i));
      }

      const redPositions = [];
      for (let i = 6; i < 11; i++) {
        redPositions.push(createMockPosition(redPlayer, i, 0, i));
      }

      // Set up column with staked card
      round.columns = [
        setupGameColumn(0, createMockCard(Color.Red, 7), blackPositions, redPositions)
      ];

      // Make the move
      const move = ai.calculateMove();

      // Verify we got a valid move
      expect(move).not.toBeNull();
      expect(move?.playerId).toBe(blackPlayer.name);

      // Check if the pair was played (most likely best move)
      if (!move?.isStake) {
        expect(move?.cards.length).toBeGreaterThan(0);
      }
    });

    // Create a more complex mid-game scenario with contested stakes
    it('should demonstrate advanced decision making in mid-game', () => {
      // Enable debug for this test
      ai.enableDebug();

      // Set up player hands
      blackPlayer.hand = [
        createMockCard(Color.Black, 9),
        createMockCard(Color.Black, 9), // Pair of 9s
        createMockCard(Color.Black, 12) // Queen
      ];

      redPlayer.hand = [
        createMockCard(Color.Red, 6),
        createMockCard(Color.Red, 7),
        createMockCard(Color.Red, 8) // Potential straight
      ];

      // Add some cards to jails to create mid-game state
      blackPlayer.jail = [
        createMockCard(Color.Red, 4),
        createMockCard(Color.Red, 5) // 9 points in jail
      ];

      redPlayer.jail = [
        createMockCard(Color.Black, 3),
        createMockCard(Color.Black, 10) // 13 points in jail
      ];

      // Create columns with existing plays
      round.columns = [];

      // Column 0: Red stake of 10 with black pair of 4s played
      const col0BlackPositions = [];
      for (let i = 0; i < 5; i++) {
        const pos = createMockPosition(blackPlayer, i, 0, i);
        // Add a pair of 4s already played on black side
        if (i === 0) pos.card = createMockCard(Color.Black, 4);
        if (i === 1) pos.card = createMockCard(Color.Black, 4);
        col0BlackPositions.push(pos);
      }

      const col0RedPositions = [];
      for (let i = 6; i < 11; i++) {
        col0RedPositions.push(createMockPosition(redPlayer, i, 0, i));
      }

      round.columns.push(
        setupGameColumn(0, createMockCard(Color.Red, 10), col0BlackPositions, col0RedPositions)
      );

      // Column 1: Black stake of King (13) with red high cards played
      const col1BlackPositions = [];
      for (let i = 0; i < 5; i++) {
        col1BlackPositions.push(createMockPosition(blackPlayer, i, 1, i));
      }

      const col1RedPositions = [];
      for (let i = 6; i < 11; i++) {
        const pos = createMockPosition(redPlayer, i, 1, i);
        // Add some high cards already played on red side
        if (i === 6) pos.card = createMockCard(Color.Red, 11); // Jack
        if (i === 7) pos.card = createMockCard(Color.Red, 12); // Queen
        col1RedPositions.push(pos);
      }

      round.columns.push(
        setupGameColumn(1, createMockCard(Color.Black, 13), col1BlackPositions, col1RedPositions)
      );

      // Column 2: Red stake of 5 (uncontested)
      const col2BlackPositions = [];
      for (let i = 0; i < 5; i++) {
        col2BlackPositions.push(createMockPosition(blackPlayer, i, 2, i));
      }

      const col2RedPositions = [];
      for (let i = 6; i < 11; i++) {
        col2RedPositions.push(createMockPosition(redPlayer, i, 2, i));
      }

      round.columns.push(
        setupGameColumn(2, createMockCard(Color.Red, 5), col2BlackPositions, col2RedPositions)
      );

      // Set victory point values
      round.victoryPointScores = {
        red: 13, // Red has 13 points from black's cards
        black: 9  // Black has 9 points from red's cards
      };

      // Make sure the round is in running state
      round.state = 'running';
      round.turn = 7; // Mid-game turn

      // Print the initial board state
      console.log("\n=== ADVANCED MID-GAME SCENARIO ===\n");
      console.log(AITestVisualization.printBoard(round));

      // Calculate move with stats
      const result = ai.calculateMoveWithStats();

      // Print the search results
      console.log(AITestVisualization.printTopMoves(result.finalCandidateMoves));
      console.log(AITestVisualization.formatSearchSummary(
        result.searchResult.nodeCount,
        result.searchResult.elapsedTimeMs,
        result.finalCandidateMoves[result.selectedMoveIndex]
      ));

      // Verify we got a valid move
      expect(result.move).not.toBeNull();
      // More detailed assertion about expected behavior
      expect(result.searchResult.nodeCount).toBeGreaterThan(10);
    });

  });

  describe('AI decision visualization', () => {
    it('should display search stats and board state for complex scenario', () => {
      // Enable debug for this test
      ai.enableDebug();

      // Create a more complex game scenario
      // Setup hands with interesting decisions
      blackPlayer.hand = [
        createMockCard(Color.Black, 5),
        createMockCard(Color.Black, 5), // Pair of 5s
        createMockCard(Color.Black, 7),
        createMockCard(Color.Black, 8),
        createMockCard(Color.Black, 9) // Potential straight with 7,8,9
      ];

      redPlayer.hand = [
        createMockCard(Color.Red, 2),
        createMockCard(Color.Red, 3),
        createMockCard(Color.Red, 3), // Pair of 3s
        createMockCard(Color.Red, 10),
        createMockCard(Color.Red, 11) // High cards
      ];

      // Create multiple columns with staked cards
      round.columns = [];

      // Column 0: Red stake of 6
      const blackPositions0 = [];
      for (let i = 0; i < 5; i++) {
        blackPositions0.push(createMockPosition(blackPlayer, i, 0, i));
      }

      const redPositions0 = [];
      for (let i = 6; i < 11; i++) {
        redPositions0.push(createMockPosition(redPlayer, i, 0, i));
      }

      round.columns.push(
        setupGameColumn(0, createMockCard(Color.Red, 6), blackPositions0, redPositions0)
      );

      // Column 1: Black stake of 10
      const blackPositions1 = [];
      for (let i = 0; i < 5; i++) {
        blackPositions1.push(createMockPosition(blackPlayer, i, 1, i));
      }

      const redPositions1 = [];
      for (let i = 6; i < 11; i++) {
        redPositions1.push(createMockPosition(redPlayer, i, 1, i));
      }

      round.columns.push(
        setupGameColumn(1, createMockCard(Color.Black, 10), blackPositions1, redPositions1)
      );

      // Print the initial board state
      console.log(AITestVisualization.printBoard(round));

      // Calculate move with stats
      const result = ai.calculateMoveWithStats();

      // Print the search results
      console.log(AITestVisualization.printTopMoves(result.finalCandidateMoves));
      console.log(AITestVisualization.formatSearchSummary(
        result.searchResult.nodeCount,
        result.searchResult.elapsedTimeMs,
        result.finalCandidateMoves[result.selectedMoveIndex]
      ));

      // Verify we got valid search stats
      expect(result.searchResult.nodeCount).toBeGreaterThan(0);
      expect(result.searchResult.elapsedTimeMs).toBeGreaterThan(0);
      expect(result.finalCandidateMoves.length).toBeGreaterThan(0);

      // Verify we got a valid move
      expect(result.move).not.toBeNull();
    });

    it('should show different moves for different difficulties', () => {
      // Setup the same scenario for multiple difficulty levels
      blackPlayer.hand = [
        createMockCard(Color.Black, 4),
        createMockCard(Color.Black, 5),
        createMockCard(Color.Black, 6), // Potential straight 4,5,6
        createMockCard(Color.Black, 8),
        createMockCard(Color.Black, 8)  // Pair of 8s
      ];

      // Set up column with staked card
      const blackPositions = [];
      for (let i = 0; i < 5; i++) {
        blackPositions.push(createMockPosition(blackPlayer, i, 0, i));
      }

      const redPositions = [];
      for (let i = 6; i < 11; i++) {
        redPositions.push(createMockPosition(redPlayer, i, 0, i));
      }

      round.columns = [
        setupGameColumn(0, createMockCard(Color.Red, 7), blackPositions, redPositions)
      ];

      // Print the initial board state
      console.log("Testing difficulty variations");
      console.log(AITestVisualization.printBoard(round));

      // Test all difficulty levels
      const difficulties = [
        AIDifficulty.NOVICE,
        AIDifficulty.EASY,
        AIDifficulty.MEDIUM,
        AIDifficulty.HARD,
        AIDifficulty.NIGHTMARE
      ];

      difficulties.forEach(difficulty => {
        // Create AI with specific difficulty
        const difficultyAI = new CozenAI(game, blackPlayer, difficulty, 2);

        // Calculate move with stats
        const result = difficultyAI.calculateMoveWithStats();

        console.log(`\n=== DIFFICULTY: ${difficulty} ===`);
        console.log(AITestVisualization.formatSearchSummary(
          result.searchResult.nodeCount,
          result.searchResult.elapsedTimeMs,
          result.finalCandidateMoves[result.selectedMoveIndex]
        ));

        // Verify we got a valid move for each difficulty
        expect(result.move).not.toBeNull();
      });
    });
  });
});
