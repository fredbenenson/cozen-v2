export interface HandEvaluation {
  strength: number;
  highCards: number[];
  includesStake: boolean;
}

export interface WinningHandResult {
  hand1Wins: boolean;
  stakeGoesToJail: boolean;
  winningCard?: number;
  jailCards: number[];
}

export class CardEvaluation {
  private static debugEnabled = false;

  // Debug control
  public static enableDebug() {
    this.debugEnabled = true;
  }

  public static disableDebug() {
    this.debugEnabled = false;
  }

  // Evaluate a single hand with an optional stake card.
  public static evaluateHand(hand: number[], stake: number): HandEvaluation {
    const result: HandEvaluation = {
      strength: 0,
      highCards: [...hand].sort((a, b) => b - a),
      includesStake: false
    };

    // Empty hand -> no strength
    if (hand.length === 0) return result;

    // Calculate base strength
    const baseStrength = this.calculateStrength(hand);

    // Calculate strength if stake is added
    const strengthWithStake = this.calculateStrength([...hand, stake]);

    // If including the stake is better, use that
    if (strengthWithStake > baseStrength) {
      result.strength = strengthWithStake;
      result.includesStake = true;
    } else {
      result.strength = baseStrength;
    }

    return result;
  }

  // Compare two hands (with a stake possibly allocated to one or the other)
  public static getWinningHand(
    hand1: number[],
    hand2: number[],
    stake: number,
    stakeIsForHand1: boolean
  ): WinningHandResult | null {
    // Evaluate each hand; stake belongs only to one side
    const score1 = this.evaluateHand(hand1, stakeIsForHand1 ? stake : -1);
    const score2 = this.evaluateHand(hand2, stakeIsForHand1 ? -1 : stake);

    const result: WinningHandResult = {
      hand1Wins: false,
      stakeGoesToJail: false,
      jailCards: []
    };

    // Compare overall strength first
    if (score1.strength !== score2.strength) {
      result.hand1Wins = score1.strength > score2.strength;
    } else {
      // Strength is tied; compare high cards (including stake if used)
      const hand1Cards = [...score1.highCards];
      const hand2Cards = [...score2.highCards];

      if (score1.includesStake) hand1Cards.push(stake);
      if (score2.includesStake) hand2Cards.push(stake);

      hand1Cards.sort((a, b) => b - a);
      hand2Cards.sort((a, b) => b - a);

      let tied = true;
      for (let i = 0; i < Math.max(hand1Cards.length, hand2Cards.length); i++) {
        const card1 = hand1Cards[i] || 0;
        const card2 = hand2Cards[i] || 0;
        if (card1 !== card2) {
          result.hand1Wins = card1 > card2;
          result.winningCard = Math.max(card1, card2);
          tied = false;
          break;
        }
      }

      // If still completely tied, return null
      if (tied) return null;
    }

    // Determine if stake goes to jail (if the stake’s owner lost)
    result.stakeGoesToJail = stakeIsForHand1 ? !result.hand1Wins : result.hand1Wins;
    if (result.stakeGoesToJail) {
      result.jailCards.push(stake);
    }

    return result;
  }

  // Helper to calculate strength of a hand (pairs + single run)
  private static calculateStrength(cards: number[]): number {
    let strength = 0;
    const sortedCards = [...cards].sort((a, b) => a - b);

    // Identify pairs (worth 3 each)
    const usedInPairs = new Set<number>();
    for (let i = 0; i < sortedCards.length - 1; i++) {
      if (sortedCards[i] === sortedCards[i + 1] && !usedInPairs.has(i)) {
        strength += 3;
        usedInPairs.add(i);
        usedInPairs.add(i + 1);
      }
    }

    // Remove paired cards before run detection
    const remainingCards = sortedCards.filter((_, i) => !usedInPairs.has(i));

    // Ace can be low or high (if we have a 14, also treat it as 1)
    if (remainingCards.includes(14)) {
      remainingCards.push(1);
    }
    remainingCards.sort((a, b) => a - b);

    // Find the longest run
    const bestRun = this.findLongestRun(remainingCards);
    if (bestRun.length >= 2) {
      strength += bestRun.length;
    }

    return strength;
  }

  // Find the longest consecutive sequence in a sorted array
  private static findLongestRun(sortedCards: number[]): number[] {
    if (sortedCards.length === 0) return [];

    let bestRun: number[] = [];
    let currentRun: number[] = [sortedCards[0]];

    for (let i = 1; i < sortedCards.length; i++) {
      if (sortedCards[i] - sortedCards[i - 1] === 1) {
        currentRun.push(sortedCards[i]);
      } else if (sortedCards[i] !== sortedCards[i - 1]) {
        if (currentRun.length > bestRun.length) {
          bestRun = [...currentRun];
        }
        currentRun = [sortedCards[i]];
      }
    }

    if (currentRun.length > bestRun.length) {
      bestRun = currentRun;
    }

    return bestRun;
  }
}
