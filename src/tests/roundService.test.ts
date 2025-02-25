import { RoundService } from '../services/round';
import { Player } from '../types/player';
import { Card, Color, Suit } from '../types/game';
import { Round } from '../types/round';

describe('RoundService', () => {
  let redPlayer: Player;
  let blackPlayer: Player;
  let round: Round;

  // Helper function to create test cards
  const createCard = (id: string, color: Color, number: number, vp: number = number): Card => ({
    id,
    color,
    suit: color === Color.Red ? Suit.Hearts : Suit.Spades,
    number,
    victoryPoints: vp,
    played: false
  });

  beforeEach(() => {
    // Setup fresh players for each test
    redPlayer = {
      color: Color.Red,
      name: 'Red Player',
      hand: [],
      jail: [],
      cards: [],
      victory_points: 0,
      availableStakes: Array.from({ length: 5 }, (_, i) => i + 5), // [5,6,7,8,9]
      stake_offset: 1,
      drawUp: jest.fn(),
      reset: jest.fn()
    };

    blackPlayer = {
      color: Color.Black,
      name: 'Black Player',
      hand: [],
      jail: [],
      cards: [],
      victory_points: 0,
      availableStakes: Array.from({ length: 5 }, (_, i) => i), // [0,1,2,3,4]
      stake_offset: -1,
      drawUp: jest.fn(),
      reset: jest.fn()
    };

    // Give each player some cards
    redPlayer.hand = [
      createCard('red_5_hearts', Color.Red, 5),
      createCard('red_7_hearts', Color.Red, 7),
      createCard('red_10_hearts', Color.Red, 10),
      createCard('red_j_hearts', Color.Red, 11, 10),
      createCard('red_k_hearts', Color.Red, 13, 70) // Poison king
    ];

    blackPlayer.hand = [
      createCard('black_2_spades', Color.Black, 2),
      createCard('black_3_spades', Color.Black, 3),
      createCard('black_8_spades', Color.Black, 8),
      createCard('black_q_spades', Color.Black, 12, 10),
      createCard('black_k_spades', Color.Black, 13, 70) // Poison king
    ];

    // Initialize round
    round = RoundService.initializeRound(redPlayer, blackPlayer, true);
  });

  describe('initialization', () => {
    it('should create a round with correct initial state', () => {
      expect(round.state).toBe('running');
      expect(round.turn).toBe(1);
      expect(round.cardsJailed).toBe(0);
      expect(round.victoryPointScores).toEqual({ red: 0, black: 0 });
    });

    it('should set up the board with correct dimensions', () => {
      const maxCards = RoundService.MAX_CARDS_PER_HAND;
      expect(round.board.length).toBe(maxCards * 2 + 1);
      expect(round.board[0].length).toBe(RoundService.MAX_STAKE_COUNT * 2);
    });

    it('should assign positions to the correct owners', () => {
      // Check top section (black)
      expect(round.board[0][0].owner).toBe(blackPlayer);
      expect(round.board[4][0].owner).toBe(blackPlayer);

      // Check middle section (stakes row)
      expect(round.board[5][0].owner).toBe(blackPlayer);
      expect(round.board[5][5].owner).toBe(redPlayer);

      // Check bottom section (red)
      expect(round.board[6][0].owner).toBe(redPlayer);
      expect(round.board[10][0].owner).toBe(redPlayer);
    });
  });

  describe('staking', () => {
    it('should handle a stake move correctly', () => {
      const stakeCard = redPlayer.hand[0];

      // Make red player active
      round.activePlayer = redPlayer;
      round.inactivePlayer = blackPlayer;

      // Make the stake move
      RoundService.makeMove(round, {
        cards: [stakeCard.id],
        column: 5,
        didStake: true,
        playerName: redPlayer.name,
        gameId: '123'
      });



      // Verify the card was staked
      expect(redPlayer.drawUp).toHaveBeenCalled();
      expect(round.activePlayer).toBe(blackPlayer); // Player switched

      // Verify the card is now in the stakes row
      expect(round.columns[5].stakedCard).toBeDefined();
      expect(round.columns[5].stakedCard?.id).toBe(stakeCard.id);
      expect(round.columns[5].stakedCard?.played).toBe(true);
    });

    it('should update available stakes when staking', () => {
      // Make red player active
      round.activePlayer = redPlayer;
      round.inactivePlayer = blackPlayer;

      // Check initial stakes
      expect(redPlayer.availableStakes.length).toBe(5);
      expect(redPlayer.availableStakes[0]).toBe(5);

      // Make a stake move
      RoundService.makeMove(round, {
        cards: [redPlayer.hand[0].id],
        column: 5,
        didStake: true,
        playerName: redPlayer.name,
        gameId: '123'
      });

      // Verify the available stakes updated
      expect(redPlayer.availableStakes.length).toBe(4);
      expect(redPlayer.availableStakes[0]).toBe(6);
    });
  });

  describe('wagering', () => {
    it('should handle a wager move correctly', () => {
      const wagerCard = redPlayer.hand[0];

      // Setup a staked column first
      const stakeCard = createCard('black_6_spades', Color.Black, 6);
      round.columns[0].stakedCard = stakeCard;

      // Make red player active
      round.activePlayer = redPlayer;
      round.inactivePlayer = blackPlayer;

      // Clear any previous calls
      jest.clearAllMocks();

      // Make the wager move
      RoundService.makeMove(round, {
        cards: [wagerCard.id],
        column: 0,
        didStake: false,
        playerName: redPlayer.name,
        gameId: '123'
      });

      // Verify the card was wagered
      expect(redPlayer.drawUp).not.toHaveBeenCalled(); // No draw on wager
      expect(round.activePlayer).toBe(blackPlayer); // Player switched

      // Find the card in the column's positions
      const redPositions = round.columns[0].positions.filter(
        pos => pos.owner === redPlayer && pos.card !== undefined
      );

      expect(redPositions.length).toBe(1);
      expect(redPositions[0].card?.id).toBe(wagerCard.id);
    });

    it('should allow multiple cards to be wagered at once', () => {
      // Setup a staked column
      const stakeCard = createCard('black_6_spades', Color.Black, 6);
      round.columns[0].stakedCard = stakeCard;

      // Make red player active
      round.activePlayer = redPlayer;
      round.inactivePlayer = blackPlayer;

      // Initial hand size check
      expect(redPlayer.hand.length).toBe(5);

      // Wager two cards
      RoundService.makeMove(round, {
        cards: [redPlayer.hand[0].id, redPlayer.hand[1].id],
        column: 0,
        didStake: false,
        playerName: redPlayer.name,
        gameId: '123'
      });

      // Find red cards in the column
      const redPositions = round.columns[0].positions.filter(
        pos => pos.owner === redPlayer && pos.card !== undefined
      );

      // Verify two cards were placed
      expect(redPositions.length).toBe(2);
      expect(redPlayer.hand.length).toBe(3); // 5 - 2 = 3 cards remaining
    });
  });

  describe('round completion', () => {
    it('should enter last_play state when a player runs out of cards', () => {
      // Setup red player with no cards
      redPlayer.hand = [];
      round.activePlayer = blackPlayer;
      round.inactivePlayer = redPlayer;

      // Make a move with the black player
      RoundService.makeMove(round, {
        cards: [blackPlayer.hand[0].id],
        column: 0,
        didStake: true,
        playerName: blackPlayer.name,
        gameId: '123'
      });

      // Round should now be in last_play state
      expect(round.state).toBe('last_play');
    });

    it('should complete the round after last play when active player has no cards', () => {
      // Set round to last_play
      round.state = 'last_play';

      // Setup black player with one card, red with none
      blackPlayer.hand = [createCard('black_4_spades', Color.Black, 4)];
      redPlayer.hand = [];

      round.activePlayer = blackPlayer;
      round.inactivePlayer = redPlayer;

      // Make final move with black player
      RoundService.makeMove(round, {
        cards: [blackPlayer.hand[0].id],
        column: 0,
        didStake: true,
        playerName: blackPlayer.name,
        gameId: '123'
      });

      // Round should now be complete
      expect(round.state).toBe('complete');
    });
  });

  describe('winner detection', () => {
    it('should detect when a player has won', () => {
      // Give red player enough points to win
      redPlayer.victory_points = RoundService.VICTORY_POINTS_TO_WIN;

      // Check for winner
      const winner = RoundService.checkForWinner(round);

      expect(winner).toBe(redPlayer);
    });

    it('should return null when no player has won', () => {
      // Points below winning threshold
      redPlayer.victory_points = 30;
      blackPlayer.victory_points = 40;

      // Check for winner
      const winner = RoundService.checkForWinner(round);

      expect(winner).toBeNull();
    });
  });
});
