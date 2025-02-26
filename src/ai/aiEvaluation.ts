// src/ai/aiEvaluation.ts
import { Color } from '../types/game';
import { MoveOption } from './aiTypes';
import { Round } from '../types/round';

/**
 * Utility class for evaluating game state for the AI
 */
export class AIEvaluation {
  /**
   * Evaluates the current game state from a given player's perspective
   * @param round Current game round
   * @param color Player's color
   * @returns Score value (positive is good for the player)
   */
  static evaluateState(round: any, color: Color): number {
    // If no victory points yet, return 0
    if (!round || !round.victoryPointScores) {
      return 0;
    }

    const scores = round.victoryPointScores;

    // Calculate the point difference from the player's perspective
    if (color === Color.Red) {
      return scores.red - scores.black;
    } else {
      return scores.black - scores.red;
    }
  }

  /**
   * Evaluates a card's value based on multiple factors
   * @param card Card to evaluate
   * @returns Estimated card value
   */
  static evaluateCard(card: any): number {
    if (!card) return 0;

    // Basic value is the card's victory points
    let value = card.victoryPoints || card.victory_points || 0;

    // Additional factors can be added here

    return value;
  }

  /**
   * Apply a move to a round (for minimax simulation)
   * @param round The round to modify
   * @param move The move to apply
   */
  static applyMove(round: Round, move: MoveOption): void {
    // Skip if round or move is invalid
    if (!round || !move) return;

    // Find the active player
    const activePlayer = round.activePlayer;
    if (!activePlayer) return;

    // Handle stake moves
    if (move.isStake && move.cards.length > 0) {
      // Find the card in the player's hand
      const cardId = move.cards[0];
      const cardIndex = activePlayer.hand.findIndex(c => c.id === cardId);

      if (cardIndex !== -1) {
        // Get the card
        const card = activePlayer.hand[cardIndex];

        // Remove it from hand
        activePlayer.hand.splice(cardIndex, 1);

        // Place it as a stake
        if (round.columns[move.column]) {
          round.columns[move.column].stakedCard = card;
        }

        // Update available stakes
        if (activePlayer.availableStakes && activePlayer.availableStakes.includes(move.column)) {
          const stakeIndex = activePlayer.availableStakes.indexOf(move.column);
          activePlayer.availableStakes.splice(stakeIndex, 1);
        }

        // Draw up a new card if there are cards in the deck
        if (activePlayer.drawUp && typeof activePlayer.drawUp === 'function') {
          activePlayer.drawUp();
        }
      }
    }
    // Handle wager moves
    else if (!move.isStake && move.cards.length > 0) {
      // Find all the cards in the player's hand
      const cardsToPlay: any[] = [];
      const cardIndices: number[] = [];

      move.cards.forEach(cardId => {
        const index = activePlayer.hand.findIndex(c => c.id === cardId);
        if (index !== -1) {
          cardsToPlay.push(activePlayer.hand[index]);
          cardIndices.push(index);
        }
      });

      // Remove the cards from hand (in reverse order to maintain indices)
      cardIndices.sort((a, b) => b - a).forEach(index => {
        activePlayer.hand.splice(index, 1);
      });

      // Place the cards in the column
      if (round.columns[move.column]) {
        const column = round.columns[move.column];

        // Find open positions in the column owned by the player
        const positions = column.positions
          .filter(pos => pos.owner === activePlayer && !pos.card)
          .slice(0, cardsToPlay.length);

        // Place cards in positions
        positions.forEach((pos, i) => {
          if (i < cardsToPlay.length) {
            pos.card = cardsToPlay[i];
          }
        });
      }
    }

    // Switch the active player
    if (round.activePlayer && round.inactivePlayer) {
      const temp = round.activePlayer;
      round.activePlayer = round.inactivePlayer;
      round.inactivePlayer = temp;
    }
  }
}
