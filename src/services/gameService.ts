import { Types } from 'mongoose';
import { BaseGameState, GameState, Color, Card, Move as GameMove } from '../types/game';
import { Player } from '../types/player';
import { Round, Move as RoundMove } from '../types/round';
import { DeckService } from './deckService';
import { RoundService } from './round';
import { IUser } from '../models/User';

export class GameService {
  private static readonly VICTORY_POINTS_TO_WIN = 70;

  /**
   * Initialize a new game between two users
   */
  public static initializeGame(user1: IUser, user2: IUser): BaseGameState {
    // Convert database users to game players
    const redPlayer = this.convertToPlayer(user1, Color.Red);
    const blackPlayer = this.convertToPlayer(user2, Color.Black);

    // Initialize decks
    this.initializePlayerDecks(redPlayer);
    this.initializePlayerDecks(blackPlayer);

    // Set up initial game state with null round
    const gameState: BaseGameState = {
      players: [
        new Types.ObjectId(user1._id.toString()),
        new Types.ObjectId(user2._id.toString())
      ],
      currentPlayerIndex: 0,
      board: [],
      round: null,
      status: 'waiting'
    };

    // Initialize first round
    const firstRound = this.startNewRound(gameState, redPlayer, blackPlayer, true);
    gameState.round = firstRound;
    gameState.status = 'in_progress';

    return gameState;
  }

  /**
   * Convert a database user to a game player
   */
  private static convertToPlayer(dbPlayer: IUser, color: Color): Player {
    // If this is already a Player, just return it
    if ('availableStakes' in dbPlayer && 'stake_offset' in dbPlayer) {
      return dbPlayer as unknown as Player;
    }

    // Otherwise, create a Player from IUser
    const player: Player = {
      id: dbPlayer._id.toString(),
      name: dbPlayer.username || `Player-${color}`,
      color,
      hand: [],
      jail: [],
      cards: [],
      victory_points: 0,
      availableStakes: color === Color.Red ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4],
      stake_offset: color === Color.Red ? 1 : -1,
      drawUp: function() {
        GameService.drawUp(this);
      },
      reset: function(options: { newDeck: boolean; shuffled: boolean }) {
        if (options.newDeck) {
          const newDeck = DeckService.createDeck(this.color);
          this.cards = [...newDeck];
        }

        if (options.shuffled) {
          this.cards = DeckService.shuffleDeck(this.cards);
        }

        this.cards.forEach((card: Card) => card.played = false);

        // Draw a new hand
        this.hand = this.cards.splice(0, 5);

        // Reset available stakes
        this.availableStakes = this.color === Color.Red
          ? [5, 6, 7, 8, 9]
          : [0, 1, 2, 3, 4];
      }
    };

    return player;
  }

  /**
   * Initialize a player's deck and draw the initial hand
   */
  private static initializePlayerDecks(player: Player): void {
    // Create a new deck for the player
    const deck = DeckService.createDeck(player.color);

    // Draw 5 cards for the initial hand
    player.hand = deck.slice(0, 5);

    // Store remaining cards in the player's deck
    player.cards = deck.slice(5);
  }

  /**
   * Start a new round in the game
   */
  public static startNewRound(
    gameState: BaseGameState,
    redPlayer: Player,
    blackPlayer: Player,
    isFirstRound: boolean,
    activePlayer?: Player,
    inactivePlayer?: Player,
    previousStakes?: { red: Card[]; black: Card[] }
  ): Round {
    // Create a new round
    const round = RoundService.initializeRound(
      redPlayer,
      blackPlayer,
      isFirstRound,
      activePlayer,
      inactivePlayer,
      previousStakes
    );

    return round;
  }

  /**
   * Process a player's move in the current round
   */
  public static makeMove(gameState: BaseGameState, move: GameMove): BaseGameState {
    if (!gameState.round || gameState.status === 'complete') {
      return gameState;
    }

    // Convert GameMove to RoundMove
    const roundMove: RoundMove = {
      cards: Array.isArray(move.cards)
        ? move.cards.map(card => typeof card === 'string' ? card : card.id)
        : [],
      column: typeof move.column === 'number' ? move.column : 0, // Ensure it's a number
      didStake: move.isStake || false, // Provide default value
      playerName: move.playerId || '', // Provide default value
      gameId: gameState.players[0].toString() // Use the game ID
    };

    // Apply the move to the current round
    RoundService.makeMove(gameState.round, roundMove);

    // Check if the round is over
    if (gameState.round.state === 'complete') {
      // Handle end of round
      this.handleRoundCompletion(gameState);
    }

    return gameState;
  }

  /**
   * Handle the completion of a round
   */
  private static handleRoundCompletion(gameState: BaseGameState): void {
    const round = gameState.round;

    if (!round) return;

    // Return any cards left in hands to player decks
    RoundService.returnHandCards(round);

    // Check for a winner
    const winner = RoundService.checkForWinner(round);

    if (winner) {
      // Game is over, set the winner
      gameState.status = 'complete';
      gameState.winner = winner.id ? new Types.ObjectId(winner.id) : undefined;
      return;
    }

    // Prepare for the next round
    this.setupNextRound(gameState);
  }

  /**
   * Set up the next round with appropriate players and stakes
   */
  private static setupNextRound(gameState: BaseGameState): void {
    const currentRound = gameState.round;

    if (!currentRound) return;

    const { redPlayer, blackPlayer } = currentRound;

    // Determine who starts the next round - alternate from previous round
    let activePlayer: Player, inactivePlayer: Player;

    if (currentRound.activePlayer === redPlayer) {
      activePlayer = blackPlayer;
      inactivePlayer = redPlayer;
    } else {
      activePlayer = redPlayer;
      inactivePlayer = blackPlayer;
    }

    // Check if no cards were jailed in the previous round
    let previousStakes: { red: Card[], black: Card[] } | undefined;

    if (currentRound.cardsJailed === 0) {
      // If no cards were jailed, keep the previous stakes
      previousStakes = currentRound.firstStakes;
    }

    // Reset players for the new round
    redPlayer.reset({ newDeck: false, shuffled: true });
    blackPlayer.reset({ newDeck: false, shuffled: true });

    // Start a new round
    gameState.round = this.startNewRound(
      gameState,
      redPlayer,
      blackPlayer,
      false,
      activePlayer,
      inactivePlayer,
      previousStakes
    );
  }

  /**
   * Get current victory point totals for both players
   */
  public static getVictoryPoints(gameState: BaseGameState): { red: number, black: number } {
    if (!gameState.round) {
      return { red: 0, black: 0 };
    }

    const { redPlayer, blackPlayer } = gameState.round;

    return {
      red: redPlayer.victory_points,
      black: blackPlayer.victory_points
    };
  }

  /**
   * Implement player's drawUp functionality
   */
  public static drawUp(player: Player): void {
    const maxHandSize = 5;

    // Only draw if hand is not full
    if (player.hand.length < maxHandSize) {
      // Draw cards until hand is full or deck is empty
      while (player.hand.length < maxHandSize && player.cards.length > 0) {
        const card = player.cards.shift();
        if (card) {
          player.hand.push(card);
        }
      }
    }
  }

  /**
   * Check current game state and return winner if the game is over
   */
  public static checkGameStatus(gameState: BaseGameState): Player | null {
    if (!gameState.round) return null;

    // Check if any player has reached the victory point threshold
    return RoundService.checkForWinner(gameState.round);
  }

  /**
   * Handle round transition after current round is complete
   */
  public static transitionToNextRound(gameState: BaseGameState): BaseGameState {
    if (!gameState.round || gameState.round.state !== 'complete' || gameState.status === 'complete') {
      return gameState;
    }

    // Process the end of the current round and start a new one
    this.handleRoundCompletion(gameState);

    return gameState;
  }
}
