// src/ai/aiEvaluation.ts
import { Color } from '../types/game';

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
}
