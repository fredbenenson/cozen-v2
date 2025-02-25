import { Round } from '../../types/round';
import { Player } from '../../types/player';
import { BoardScorer } from './boardScorer';

/**
 * Service responsible for managing round state transitions
 */
export class StateManager {
  static readonly VICTORY_POINTS_TO_WIN = 70;

  /**
   * Update the round state based on current conditions
   */
  static updateRoundState(round: Round): void {
    // Check if the round is over and update state accordingly
    this.checkIfRoundOver(round);
  }

  /**
   * Check if the round is over and update state accordingly
   */
  private static checkIfRoundOver(round: Round): void {
    // Important: Check inactive player first to ensure correct state transition

    // Enter last_play if inactive player has no cards
    if (round.inactivePlayer.hand.length === 0 && round.state !== 'complete') {
      round.state = 'last_play';
    }

    // Round is complete if active player has no cards in hand and we're in last_play
    if (round.activePlayer.hand.length === 0 && round.state === 'last_play') {
      this.endRound(round);
    }
  }

  /**
   * End the round and score the board
   */
  private static endRound(round: Round): void {
    // Score the board to determine who won what
    BoardScorer.scoreBoard(round);

    // Mark the round as complete
    round.state = 'complete';
  }

  /**
   * Return hand cards to player decks at end of round
   */
  static returnHandCards(round: Round): void {
    // Return red player's hand
    if (round.redPlayer.hand.length > 0) {
      round.redPlayer.cards.push(...round.redPlayer.hand);
      round.redPlayer.hand = [];
    }

    // Return black player's hand
    if (round.blackPlayer.hand.length > 0) {
      round.blackPlayer.cards.push(...round.blackPlayer.hand);
      round.blackPlayer.hand = [];
    }
  }

  /**
   * Check if a player has won the game
   */
  static checkForWinner(round: Round): Player | null {
    // Check if red player has won
    if (round.redPlayer.victory_points >= this.VICTORY_POINTS_TO_WIN) {
      return round.redPlayer;
    }

    // Check if black player has won
    if (round.blackPlayer.victory_points >= this.VICTORY_POINTS_TO_WIN) {
      return round.blackPlayer;
    }

    // No winner yet
    return null;
  }
}
