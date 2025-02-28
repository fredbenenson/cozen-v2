// src/services/cozenEvaluation.ts

import { HandEvaluationResult, WinningHandResult, Hand } from '../types/evaluation';
import { CardEvaluation } from './cardEvaluation';

/**
 * @deprecated Use CardEvaluation instead. This class is kept for backwards compatibility.
 */
export class CozenEvaluation {
  static getWinningHand(
    h1: Hand,
    h2: Hand,
    stake: number,
    stakeIsForH1: boolean
  ): WinningHandResult | null {
    // Delegate to CardEvaluation
    const result = CardEvaluation.getWinningHand(h1, h2, stake, stakeIsForH1);
    
    // If null (tie), return null
    if (!result) return null;
    
    // Otherwise, convert CardEvaluation result to CozenEvaluation result format
    return {
      hand1Wins: result.hand1Wins,
      stakeGoesToJail: result.stakeGoesToJail,
      winningCard: result.winningCard ? result.winningCard.toString() : "",
      jailHand: result.jailCards || []
    };
  }

  static evaluateHand(h: Hand, stake: number): HandEvaluationResult {
    // Delegate to CardEvaluation
    const result = CardEvaluation.evaluateHand(h, stake);
    
    // Convert CardEvaluation result to CozenEvaluation result format
    return {
      value: result.strength,
      highCardList: result.highCards,
      includesStake: result.includesStake
    };
  }

  private static sortHand(hand: Hand, reverse: boolean): Hand {
    return [...hand].sort((a, b) => reverse ? b - a : a - b);
  }

  private static numberToCardName(num: number): string {
    return CardEvaluation.numberToCardName(num);
  }
}