/**
 * Evaluate which hand wins in a contested column
 */
export function evaluateHands(
  hand1: number[], // Red
  hand2: number[], // Black
  stakeValue: number,
  stakeIsForHand1: boolean
): { hand1Wins: boolean; stakeGoesToJail: boolean } | null {
  // Calculate strength for hand 1 (Red)
  const hand1Strength = calculateHandStrength(hand1, stakeIsForHand1 ? stakeValue : undefined);
  
  // Calculate strength for hand 2 (Black)
  const hand2Strength = calculateHandStrength(hand2, !stakeIsForHand1 ? stakeValue : undefined);
  
  // Determine winner based on strength
  if (hand1Strength.total > hand2Strength.total) {
    return { 
      hand1Wins: true, 
      stakeGoesToJail: !stakeIsForHand1 || !hand1Strength.usedStake
    };
  } else if (hand2Strength.total > hand1Strength.total) {
    return { 
      hand1Wins: false, 
      stakeGoesToJail: stakeIsForHand1 || !hand2Strength.usedStake 
    };
  } else {
    // Tiebreaker: highest card (not counting stake unless used in combo)
    const high1 = getHighestCard(hand1, stakeIsForHand1 ? stakeValue : undefined, hand1Strength.usedStake);
    const high2 = getHighestCard(hand2, !stakeIsForHand1 ? stakeValue : undefined, hand2Strength.usedStake);
    
    if (high1 > high2) {
      return { 
        hand1Wins: true, 
        stakeGoesToJail: !stakeIsForHand1 || !hand1Strength.usedStake
      };
    } else if (high2 > high1) {
      return { 
        hand1Wins: false, 
        stakeGoesToJail: stakeIsForHand1 || !hand2Strength.usedStake 
      };
    } else {
      // Complete tie
      return null;
    }
  }
}

/**
 * Calculate the strength of a hand
 */
function calculateHandStrength(
  hand: number[],
  stakeValue?: number
): { total: number; usedStake: boolean } {
  let strength = 0;
  let usedStake = false;
  
  // Sort hand by value
  const sortedHand = [...hand].sort((a, b) => a - b);
  
  // Check for pairs (value 3 per pair)
  const valueCount: Record<number, number> = {};
  [...sortedHand, stakeValue].filter(Boolean).forEach(value => {
    if (value !== undefined) {
      valueCount[value] = (valueCount[value] || 0) + 1;
    }
  });
  
  // Find pairs
  const usedCards = new Set<number>();
  Object.entries(valueCount).forEach(([value, count]) => {
    const numValue = Number(value);
    
    // Check if this is a pair
    if (count >= 2) {
      // Check if this pair includes the stake
      const includesStake = stakeValue === numValue;
      
      // Only count the pair if it doesn't use already-counted cards
      const availableInHand = sortedHand.filter(v => v === numValue).length;
      const needFromHand = includesStake ? 1 : 2;
      
      if (availableInHand >= needFromHand) {
        strength += 3; // Pair value
        usedStake = usedStake || includesStake;
        
        // Mark these cards as used in future calculations
        sortedHand.forEach((v, i) => {
          if (v === numValue && !usedCards.has(i)) {
            usedCards.add(i);
          }
        });
      }
    }
  });
  
  // Check for straights (value = number of cards)
  const straightResult = findBestStraight(sortedHand, stakeValue);
  if (straightResult && straightResult.length >= 2) {
    strength += straightResult.length;
    usedStake = usedStake || (stakeValue !== undefined && straightResult.includes(stakeValue));
  }
  
  return { total: strength, usedStake };
}

/**
 * Find the best straight in a hand
 */
function findBestStraight(
  sortedHand: number[],
  stakeValue?: number
): number[] | null {
  // Add stake to hand if provided
  const fullHand = stakeValue !== undefined 
    ? [...sortedHand, stakeValue].sort((a, b) => a - b)
    : sortedHand;
  
  // Remove duplicates and create unique set
  const uniqueValues = Array.from(new Set(fullHand));
  
  let bestStraight: number[] = [];
  
  // Handle Ace as both low (1) and high (14)
  const withHighAce = uniqueValues.includes(1) 
    ? [...uniqueValues.filter(v => v !== 1), 14].sort((a, b) => a - b)
    : uniqueValues;
  
  // Find longest straight in uniqueValues
  let currentStraight: number[] = [];
  
  for (let i = 0; i < uniqueValues.length; i++) {
    if (i === 0 || uniqueValues[i] === uniqueValues[i-1] + 1) {
      currentStraight.push(uniqueValues[i]);
    } else {
      // Break in sequence, check if this was the longest
      if (currentStraight.length > bestStraight.length) {
        bestStraight = [...currentStraight];
      }
      currentStraight = [uniqueValues[i]];
    }
  }
  
  // Check final sequence
  if (currentStraight.length > bestStraight.length) {
    bestStraight = [...currentStraight];
  }
  
  // Also check with high ace
  currentStraight = [];
  for (let i = 0; i < withHighAce.length; i++) {
    if (i === 0 || withHighAce[i] === withHighAce[i-1] + 1) {
      currentStraight.push(withHighAce[i]);
    } else {
      if (currentStraight.length > bestStraight.length) {
        bestStraight = [...currentStraight];
      }
      currentStraight = [withHighAce[i]];
    }
  }
  
  // Check final high ace sequence
  if (currentStraight.length > bestStraight.length) {
    bestStraight = [...currentStraight];
  }
  
  // Convert any 14 back to 1 for consistency
  bestStraight = bestStraight.map(v => v === 14 ? 1 : v);
  
  return bestStraight.length >= 2 ? bestStraight : null;
}

/**
 * Get the highest card value (for tiebreakers)
 */
function getHighestCard(
  hand: number[],
  stakeValue?: number,
  countStake: boolean = false
): number {
  if (countStake && stakeValue !== undefined) {
    return Math.max(...hand, stakeValue);
  }
  return Math.max(...hand, 0);
}