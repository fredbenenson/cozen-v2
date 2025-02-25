import { Card, Color } from '../../types/game';
import { Round, Column } from '../../types/round';
import { Player } from '../../types/player';
import { CardEvaluation } from '../cardEvaluation';

/**
 * Service responsible for scoring the game board and resolving contested hands
 */
export class BoardScorer {
  /**
   * Score the board and resolve all contested columns
   */
  static scoreBoard(round: Round): void {
    // Reset victory point scores for this round
    round.victoryPointScores = { red: 0, black: 0 };

    // Iterate through all columns
    round.columns.forEach(column => {
      // Only process columns that have a stake card
      if (!column.stakedCard) return;

      // Check if the column is contested (has cards from both players)
      if (this.isColumnContested(column, round)) {
        // Resolve the contested column
        this.resolveContestedColumn(column, round);
      } else {
        // For uncontested columns, return all cards to their owners
        this.returnUncontestedCards(column, round);
      }
    });
  }

  /**
   * Check if a column is contested (has cards from both players)
   */
  private static isColumnContested(column: Column, round: Round): boolean {
    // Get all cards in the column except the stake
    const cards = column.positions
      .filter(pos => pos.card && pos.card !== column.stakedCard)
      .map(pos => pos.card as Card);

    // Check if there are cards from both players
    const hasRed = cards.some(card => card.color === Color.Red);
    const hasBlack = cards.some(card => card.color === Color.Black);

    // Column is contested if it has cards from both players
    return hasRed && hasBlack;
  }

  /**
   * Return cards from uncontested columns back to their owners
   */
  private static returnUncontestedCards(column: Column, round: Round): void {
    // Get all cards in the column except the stake
    const cards = column.positions
      .filter(pos => pos.card && pos.card !== column.stakedCard)
      .map(pos => pos.card as Card);

    // Return stake card to its owner's deck
    if (column.stakedCard) {
      const stakeOwner = column.stakedCard.color === Color.Red ?
        round.redPlayer : round.blackPlayer;

      stakeOwner.cards.push(column.stakedCard);
    }

    // Return played cards to their owners' decks
    cards.forEach(card => {
      const owner = card.color === Color.Red ? round.redPlayer : round.blackPlayer;
      owner.cards.push(card);
    });

    // Clear the column
    column.positions.forEach(pos => {
      pos.card = undefined;
    });
    column.stakedCard = undefined;
  }

  /**
   * Resolve a contested column and move cards to jail as needed
   */
  private static resolveContestedColumn(column: Column, round: Round): void {
    if (!column.stakedCard) return;

    // Get the stake card
    const stakeCard = column.stakedCard;
    const stakeOwner = stakeCard.color === Color.Red ? round.redPlayer : round.blackPlayer;

    // Get red and black cards separately, excluding the stake card
    const redCards = column.positions
      .filter(pos => pos.card && pos.card.color === Color.Red && pos.card !== stakeCard)
      .map(pos => pos.card as Card);

    const blackCards = column.positions
      .filter(pos => pos.card && pos.card.color === Color.Black && pos.card !== stakeCard)
      .map(pos => pos.card as Card);

    // Get the card numbers for evaluation
    const redNumbers = redCards.map(card => card.number);
    const blackNumbers = blackCards.map(card => card.number);

    // Determine if the stake belongs to the red or black player
    const stakeIsForRed = stakeCard.color === Color.Red;

    // Evaluate the hands to determine a winner
    const result = CardEvaluation.getWinningHand(
      redNumbers,
      blackNumbers,
      stakeCard.number,
      stakeIsForRed
    );

    // If there's a winner (not a tie), determine who won and update jails
    if (result) {
      const winner = result.hand1Wins ? round.redPlayer : round.blackPlayer;
      const loser = result.hand1Wins ? round.blackPlayer : round.redPlayer;

      // Cards that will be jailed (loser's cards)
      const cardsToJail = result.hand1Wins ? blackCards : redCards;

      // Add stake to jail if it goes to jail
      if (result.stakeGoesToJail) {
        cardsToJail.push(stakeCard);
      } else {
        // Return stake to owner's deck if it doesn't go to jail
        stakeOwner.cards.push(stakeCard);
      }

      // Move cards to jail
      this.moveCardsToJail(cardsToJail, winner, round);

      // Return winner's cards to their deck
      const winnerCards = result.hand1Wins ? redCards : blackCards;
      winnerCards.forEach(card => {
        winner.cards.push(card);
      });
    } else {
      // If there's a tie, all cards return to their owners
      redCards.forEach(card => round.redPlayer.cards.push(card));
      blackCards.forEach(card => round.blackPlayer.cards.push(card));
      stakeOwner.cards.push(stakeCard);
    }

    // Clear the column after resolution
    column.positions.forEach(pos => {
      pos.card = undefined;
    });
    column.stakedCard = undefined;
  }

  /**
   * Move cards to the winner's jail and update victory points
   */
  private static moveCardsToJail(cards: Card[], winner: Player, round: Round): void {
    cards.forEach(card => {
      // Only jail cards from the opponent
      if (card.color !== winner.color) {
        // Add card to jail
        winner.jail.push(card);

        // Update victory points
        round.victoryPointScores[winner.color] += card.victoryPoints;
        winner.victory_points += card.victoryPoints;

        // Increment cards jailed count
        round.cardsJailed++;
      }
    });
  }
}
