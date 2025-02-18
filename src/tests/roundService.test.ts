// src/tests/roundService.test.ts

import { RoundService } from '../services/roundService';
import { Player } from '../types/player';
import { Card, Color, Suit } from '../types/game';
import { Round } from '../types/round';

describe('RoundService', () => {
  let redPlayer: Player;
  let blackPlayer: Player;
  let round: Round;

  beforeEach(() => {
    // Reset players before each test
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

    // Initialize round with black player starting
    round = RoundService.initializeRound(redPlayer, blackPlayer, true);
  });

  describe('initialization', () => {
    it('creates a round with correct initial state', () => {
      expect(round.state).toBe('running');
      expect(round.turn).toBe(1);
      expect(round.cardsJailed).toBe(0);
      expect(round.victoryPointScores).toEqual({ red: 0, black: 0 });
      expect(round.firstStakes).toEqual({ red: [], black: [] });
    });

    it('sets up the board with correct dimensions', () => {
      const maxCards = RoundService.MAX_CARDS_PER_HAND;
      const maxStakes = RoundService.MAX_STAKE_COUNT;

      expect(round.board.length).toBe(maxCards * 2 + 1);
      expect(round.board[0].length).toBe(maxStakes * 2);
    });

    it('assigns correct owners to board positions', () => {
      const maxCards = RoundService.MAX_CARDS_PER_HAND;

      // Check top section (black)
      expect(round.board[0][0].owner).toBe(blackPlayer);
      expect(round.board[maxCards - 1][0].owner).toBe(blackPlayer);

      // Check bottom section (red)
      expect(round.board[maxCards + 1][0].owner).toBe(redPlayer);
      expect(round.board[maxCards * 2][0].owner).toBe(redPlayer);
    });
  });

  describe('staking', () => {
    it('handles a stake move correctly', () => {
      const stakeCard: Card = {
        id: 'red_5_hearts',
        color: Color.Red,
        number: 5,
        suit: Suit.Hearts,
        victoryPoints: 5,
        played: false
      };

      // Setup red player as active with a card
      round.activePlayer = redPlayer;
      round.inactivePlayer = blackPlayer;
      redPlayer.hand = [stakeCard];

      // Make the stake move
      RoundService.makeMove(round, {
        cards: [stakeCard.id],
        column: 5, // Use a valid stake position
        didStake: true,
        playerName: redPlayer.name,
        gameId: '123'
      });

      // Verify the results
      expect(redPlayer.drawUp).toHaveBeenCalled();
      expect(round.activePlayer).toBe(blackPlayer);
      expect(round.inactivePlayer).toBe(redPlayer);
      expect(stakeCard.played).toBe(true);
    });
  });

  describe('wagering', () => {
    it('handles a wager move correctly', () => {
      const wagerCard: Card = {
        id: 'red_7_hearts',
        color: Color.Red,
        number: 7,
        suit: Suit.Hearts,
        victoryPoints: 7,
        played: false
      };

      // Setup red player as active with a card
      round.activePlayer = redPlayer;
      round.inactivePlayer = blackPlayer;
      redPlayer.hand = [wagerCard];

      // Make the wager move
      RoundService.makeMove(round, {
        cards: [wagerCard.id],
        column: 0,
        didStake: false,
        playerName: redPlayer.name,
        gameId: '123'
      });

      // Verify the results
      expect(redPlayer.drawUp).not.toHaveBeenCalled();
      expect(redPlayer.hand).toHaveLength(0);
      expect(round.activePlayer).toBe(blackPlayer);
      expect(round.inactivePlayer).toBe(redPlayer);
      expect(wagerCard.played).toBe(true);
    });
  });

  describe('round completion', () => {
    it('enters last_play state when a player runs out of cards', () => {
      redPlayer.hand = [];
      round.activePlayer = blackPlayer;
      round.inactivePlayer = redPlayer;

      RoundService.makeMove(round, {
        cards: ['some_card'],
        column: 0,
        didStake: true,
        playerName: blackPlayer.name,
        gameId: '123'
      });

      expect(round.state).toBe('last_play');
    });

    it('completes the round after last play', () => {
      round.state = 'last_play';
      round.activePlayer = redPlayer;
      redPlayer.hand = [];

      RoundService.makeMove(round, {
        cards: ['last_card'],
        column: 0,
        didStake: true,
        playerName: redPlayer.name,
        gameId: '123'
      });

      expect(round.state).toBe('complete');
    });
  });
});
