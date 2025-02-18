// src/services/cozenEvaluation.ts

import { HandEvaluationResult, WinningHandResult, Hand } from '../types/evaluation';

export class CozenEvaluation {
  static getWinningHand(
    h1: Hand,
    h2: Hand,
    stake: number,
    stakeIsForH1: boolean
  ): WinningHandResult | null {
    let score1: HandEvaluationResult = stakeIsForH1 
      ? this.evaluateHand(h1, stake)
      : this.evaluateHand(h1, -1);

    let score2: HandEvaluationResult = stakeIsForH1
      ? this.evaluateHand(h2, -1)
      : this.evaluateHand(h2, stake);

    let results: WinningHandResult = {
      hand1Wins: false,
      stakeGoesToJail: false,
      winningCard: "",
      jailHand: []
    };

    let score1TieValue = 0;
    let score2TieValue = 0;

    if (score1.value === score2.value) {
      // Break a tie by comparing high cards
      const longerSet = Math.max(score1.highCardList.length, score2.highCardList.length);

      for (let c = 0; c < longerSet; c++) {
        let aCard = 0;
        let bCard = 0;

        if (score1.highCardList.length > c) {
          aCard = score1.highCardList[c];
        }

        if (score2.highCardList.length > c) {
          bCard = score2.highCardList[c];
        }

        if (aCard > bCard) {
          results.winningCard = this.numberToCardName(aCard);
          score1TieValue++;
          break;
        } else if (bCard > aCard) {
          results.winningCard = this.numberToCardName(bCard);
          score2TieValue++;
          break;
        }
      }
    }

    if (score1.value + score1TieValue > score2.value + score2TieValue) {
      results.hand1Wins = true;
      results.stakeGoesToJail = !stakeIsForH1;

      if (!stakeIsForH1) {
        results.jailHand.push(stake);
      }

      return results;
    } else if (score2.value + score2TieValue > score1.value + score1TieValue) {
      results.hand1Wins = false;
      results.stakeGoesToJail = stakeIsForH1;

      if (stakeIsForH1) {
        results.jailHand.push(stake);
      }

      return results;
    } else if (score1.value + score1TieValue === score2.value + score2TieValue) {
      return null;  // Tie
    }

    return results;
  }

  static evaluateHand(h: Hand, stake: number): HandEvaluationResult {
    let hand = [...h]; // Copy the array to avoid modifying the original
    let results: HandEvaluationResult = {
      value: 0,
      highCardList: [...hand],
      includesStake: false
    };

    if (hand.length === 0) {
      return results;
    }

    // If the stake matches a card in the hand, add it
    if (hand.includes(stake)) {
      hand.push(stake);
      results.includesStake = true;
    }

    // Sort hand low to high
    hand = this.sortHand(hand, false);

    // Look for pairs if we have at least 2 cards
    if (hand.length > 1) {
      // Find and remove pairs
      for (let c = hand.length - 1; c > 0; c--) {
        if (hand[c] === hand[c - 1]) {
          results.value += 3;  // Pairs are worth 3 points
          hand.splice(c - 1, 2);
        }
      }
    }

    // If stake wasn't in a pair, add it now for run tests
    if (!results.includesStake) {
      hand.push(stake);
    }

    // Handle Ace high/low
    if (hand.includes(14)) {
      hand.push(1);
    }

    hand = this.sortHand(hand, false);

    // Look for runs if we have at least 2 cards
    if (hand.length > 1) {
      let bestRun: number[] = [];
      let curRun: number[] = [hand[0]];

      for (let i = 1; i < hand.length; i++) {
        if (hand[i] - hand[i - 1] === 1) {
          curRun.push(hand[i]);
          if (curRun.length > bestRun.length) {
            bestRun = [...curRun];
          }
        } else {
          curRun = [hand[i]];
        }
      }

      if (bestRun.length > 1) {
        if (bestRun.includes(stake)) {
          results.includesStake = true;
        } else if (stake === 14 && bestRun.includes(1)) {
          results.includesStake = true;
        }

        results.value += bestRun.length;
      }
    }

    // Update high card list
    results.highCardList = this.sortHand(results.highCardList, true);

    if (results.includesStake) {
      results.highCardList.push(stake);
    }

    return results;
  }

  private static sortHand(hand: Hand, reverse: boolean): Hand {
    return [...hand].sort((a, b) => reverse ? b - a : a - b);
  }

  private static numberToCardName(num: number): string {
    switch (num) {
      case 11: return "J";
      case 12: return "Q";
      case 13: return "K";
      case 14: return "A";
      default: return num.toString();
    }
  }
}