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

  public static enableDebug() {
    this.debugEnabled = true;
  }

  public static disableDebug() {
    this.debugEnabled = false;
  }

  private static debug(...args: any[]) {
    if (this.debugEnabled) {
      console.log(...args);
    }
  }

  public static numberToCardName(num: number): string {
    switch (num) {
      case 11: return 'J';
      case 12: return 'Q';
      case 13: return 'K';
      case 14: return 'A';
      default: return num.toString();
    }
  }

  public static getWinningHand(
    h1: number[],
    h2: number[],
    stake: number,
    stakeIsForH1: boolean
  ): WinningHandResult | null {
    this.debug('\n=== Starting Hand Comparison ===');
    this.debug('Hand1:', h1);
    this.debug('Hand2:', h2);
    this.debug('Stake:', stake, 'belongs to:', stakeIsForH1 ? 'Hand1' : 'Hand2');

    const score1 = stakeIsForH1 ? this.evaluateHand(h1, stake) : this.evaluateHand(h1, -1);
    const score2 = stakeIsForH1 ? this.evaluateHand(h2, -1) : this.evaluateHand(h2, stake);

    this.debug('\nScores after evaluation:');
    this.debug('Hand1 Score:', score1);
    this.debug('Hand2 Score:', score2);

    const results: WinningHandResult = {
      hand1Wins: false,
      stakeGoesToJail: false,
      jailCards: []
    };

    // Compare strengths first
    if (score1.strength !== score2.strength) {
      this.debug('\nStrengths differ:', score1.strength, 'vs', score2.strength);
      results.hand1Wins = score1.strength > score2.strength;
      this.debug('Winner by strength:', results.hand1Wins ? 'Hand1' : 'Hand2');

      // Handle stake jailing
      if (results.hand1Wins) {
        if (!stakeIsForH1 && score2.includesStake) {
          this.debug('Stake used in losing Hand2 - goes to jail');
          results.stakeGoesToJail = true;
          results.jailCards.push(stake);
        } else {
          this.debug('Stake either not used or belongs to winning hand - stays');
        }
      } else {
        if (stakeIsForH1 && score1.includesStake) {
          this.debug('Stake used in losing Hand1 - goes to jail');
          results.stakeGoesToJail = true;
          results.jailCards.push(stake);
        } else {
          this.debug('Stake either not used or belongs to winning hand - stays');
        }
      }
      return results;
    }

    // If strengths are equal, compare high cards
    if (score1.strength === score2.strength) {
      this.debug('\nStrengths equal:', score1.strength);
      this.debug('Comparing high cards:');
      this.debug('Hand1 high cards:', score1.highCards);
      this.debug('Hand2 high cards:', score2.highCards);

      // Sort original hand by value in descending order for high card comparison
      const h1Sorted = [...h1].sort((a, b) => b - a);
      const h2Sorted = [...h2].sort((a, b) => b - a);

      // Compare each position
      let winningCardFound = false;
      for (let i = 0; i < Math.max(h1Sorted.length, h2Sorted.length); i++) {
        const card1 = h1Sorted[i] || 0;
        const card2 = h2Sorted[i] || 0;

        this.debug(`Comparing position ${i}:`, card1, 'vs', card2);

        if (card1 !== card2) {
          results.hand1Wins = card1 > card2;
          results.winningCard = card1 > card2 ? card1 : card2;
          winningCardFound = true;
          this.debug('Found winning card:', this.numberToCardName(results.winningCard));
          this.debug('Winner:', results.hand1Wins ? 'Hand1' : 'Hand2');
          break;
        } else {
          this.debug('Cards equal, continuing comparison');
        }
      }

      if (!winningCardFound) {
        this.debug('No winning card found - complete tie');
        return null;
      }

      // Handle stake jailing for tied strength
      if (results.hand1Wins) {
        if (!stakeIsForH1 && score2.includesStake) {
          this.debug('Stake used in losing Hand2 in tie break - goes to jail');
          results.stakeGoesToJail = true;
          results.jailCards.push(stake);
        } else {
          this.debug('Stake either not used or belongs to winning hand - stays');
        }
      } else {
        if (stakeIsForH1 && score1.includesStake) {
          this.debug('Stake used in losing Hand1 in tie break - goes to jail');
          results.stakeGoesToJail = true;
          results.jailCards.push(stake);
        } else {
          this.debug('Stake either not used or belongs to winning hand - stays');
        }
      }

      return results;
    }

    return null;
  }

  public static evaluateHand(h: number[], stake: number): HandEvaluation {
    this.debug('\n--- Evaluating Hand ---');
    this.debug('Initial hand:', h);
    this.debug('Stake:', stake);

    const hand = h.slice();
    const results: HandEvaluation = {
      strength: 0,
      highCards: [...hand],
      includesStake: false
    };

    if (hand.length === 0) {
      this.debug('Empty hand - returning zero strength');
      return results;
    }

    // Try to include stake in pairs first
    if (stake !== -1 && hand.includes(stake)) {
      hand.push(stake);
      results.includesStake = true;
      this.debug('Found matching card for stake - including in combinations');
    }

    // Sort for pair finding
    const sortedHand = [...hand].sort((a, b) => a - b);
    this.debug('Sorted hand for pair finding:', sortedHand);

    const pairedCards = new Set<number>();

    // Find pairs
    for (let i = 0; i < sortedHand.length - 1; i++) {
      if (sortedHand[i] === sortedHand[i + 1] && !pairedCards.has(i)) {
        results.strength += 3;
        pairedCards.add(i);
        pairedCards.add(i + 1);
        this.debug('Found pair:', sortedHand[i], '+', sortedHand[i + 1], '= 3 strength');
      }
    }

    // Get unpaired cards for run checking
    const remainingCards = sortedHand.filter((_, i) => !pairedCards.has(i));
    this.debug('Remaining unpaired cards:', remainingCards);

    // Try stake in runs if not used in pairs
    if (stake !== -1 && !results.includesStake) {
      remainingCards.push(stake);
      this.debug('Adding stake for run check:', stake);
    }

    // Handle ace high/low for runs
    if (remainingCards.includes(14)) {
      remainingCards.push(1);
      this.debug('Added low ace (1) for run checking');
    }

    remainingCards.sort((a, b) => a - b);
    this.debug('Sorted remaining cards for run check:', remainingCards);

    // Find longest run
    let bestRun: number[] = [];
    let currentRun = [remainingCards[0]];

    for (let i = 1; i < remainingCards.length; i++) {
      if (remainingCards[i] - remainingCards[i - 1] === 1) {
        currentRun.push(remainingCards[i]);
        this.debug('Building run:', currentRun);
      } else {
        if (currentRun.length > bestRun.length) {
          bestRun = [...currentRun];
          this.debug('New best run found:', bestRun);
        }
        currentRun = [remainingCards[i]];
      }
    }

    // Check final run
    if (currentRun.length > bestRun.length) {
      bestRun = currentRun;
      this.debug('Final run is best:', bestRun);
    }

    // Add run strength if found
    if (bestRun.length >= 2) {
      if (stake !== -1 && bestRun.includes(stake)) {
        results.includesStake = true;
        this.debug('Stake is part of the run');
      }
      results.strength += bestRun.length;
      this.debug('Run adds', bestRun.length, 'strength');
    }

    // Update high cards to include stake if used
    if (results.includesStake) {
      results.highCards.push(stake);
      this.debug('Including stake in high cards');
    }

    // Sort high cards in descending order
    results.highCards.sort((a, b) => b - a);
    this.debug('Final high cards:', results.highCards);
    this.debug('Final strength:', results.strength);

    return results;
  }
}
