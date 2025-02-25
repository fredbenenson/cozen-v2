import { Player } from '../../types/player';
import { Round, Move, Position } from '../../types/round';
import { Card, Color } from '../../types/game';

/**
 * Service responsible for processing player moves
 */
export class MoveProcessor {
  static readonly MAX_CARDS_PER_HAND = 5;

  /**
   * Process a move in the game (stake or wager)
   */
  static processMove(round: Round, move: Move): void {
    if (!round || !move) return;

    // Handle the move based on type
    if (move.didStake) {
      this.handleStakeMove(round, move);
    } else {
      this.handleWagerMove(round, move);
    }

    // Update active player after the move
    this.updateActivePlayer(round);
  }

  /**
   * Handle a stake move
   */
  private static handleStakeMove(round: Round, move: Move): void {
    // Find the exact card object in the player's hand by ID
    const cardId = move.cards[0];
    const cardIndex = round.activePlayer.hand.findIndex(c => c.id === cardId);

    if (cardIndex !== -1) {
      // Get the actual card object
      const card = round.activePlayer.hand[cardIndex];

      // Mark card as played
      card.played = true;

      // Remove card from hand
      round.activePlayer.hand.splice(cardIndex, 1);

      // Stake the card
      this.stakeCard(round.activePlayer, card, round);

      // Draw a new card
      round.activePlayer.drawUp();
    }
  }

  /**
   * Handle a wager move
   */
  private static handleWagerMove(round: Round, move: Move): void {
    // Make a copy of the hand before modification
    const originalHand = [...round.activePlayer.hand];

    // Find exact card objects in the player's hand by ID
    const cardsToPlay: Card[] = [];
    move.cards.forEach(cardId => {
      // Find the original card object from the player's hand
      const originalCard = originalHand.find(c => c.id === cardId);
      if (originalCard) {
        // Mark card as played
        originalCard.played = true;
        cardsToPlay.push(originalCard);
      }
    });

    if (cardsToPlay.length === 0) return;

    // Remove cards from hand (preserve other cards exactly as they were)
    round.activePlayer.hand = originalHand.filter(
      handCard => !cardsToPlay.includes(handCard)
    );

    // Place cards in the specified column
    this.placeWageredCards(move.column, cardsToPlay, round.activePlayer, round);

    // IMPORTANT: No drawUp() call for wager moves
  }

  /**
   * Stake a card in the stakes row
   */
  private static stakeCard(player: Player, card: Card, round: Round): void {
    // Get the next available stake position for this player
    if (!player.availableStakes || player.availableStakes.length === 0) {
      console.warn('No available stakes for player', player.name);
      return;
    }

    const stakeColumn = player.availableStakes.shift();
    if (stakeColumn === undefined) return;

    // Place card in the stakes row at the correct column
    round.board[this.MAX_CARDS_PER_HAND][stakeColumn].card = card;

    // Update the column's stakedCard for easier access
    round.columns[stakeColumn].stakedCard = card;
  }

  /**
   * Place wagered cards in a column
   */
  private static placeWageredCards(
    column: number,
    cards: Card[],
    player: Player,
    round: Round
  ): void {
    // Find open positions in the column owned by the player
    const positions = round.columns[column].positions
      .filter(pos => pos.owner === player && !pos.card)
      .sort((a, b) => {
        // Sort positions based on player color (differently for red and black)
        return (a.n - b.n) * (player.color === Color.Red ? 1 : -1);
      });

    // Place cards in the positions
    for (let i = 0; i < Math.min(cards.length, positions.length); i++) {
      const pos = positions[i];
      round.board[pos.coord[0]][pos.coord[1]].card = cards[i];
    }
  }

  /**
   * Update active player
   */
  static updateActivePlayer(round: Round): void {
    const temp = round.activePlayer;
    round.activePlayer = round.inactivePlayer;
    round.inactivePlayer = temp;
  }
}
