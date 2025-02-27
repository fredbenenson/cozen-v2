import { AIMoveGenerator } from '../ai/aiMoveGenerator';
import { CardEvaluation } from '../services/cardEvaluation';
import { Color, Suit, Card } from '../types/game';
import { Player } from '../types/player';
import { DeckService } from '../services/deckService';
import { RoundService } from '../services/round';
import { Round } from '../types/round';

// Utility functions for displaying cards and the board
function displayCard(card?: Card): string {
  if (!card) return '__';
  
  const suitSymbol = 
    card.suit === Suit.Hearts ? '♥' :
    card.suit === Suit.Diamonds ? '♦' :
    card.suit === Suit.Clubs ? '♣' : '♠';
  
  const numberStr = 
    card.number === 11 ? 'J' :
    card.number === 12 ? 'Q' :
    card.number === 13 ? 'K' :
    card.number === 14 ? 'A' : card.number.toString();
  
  // Color the output in the terminal
  const colorCode = card.color === Color.Red ? '\x1b[31m' : '\x1b[30m';
  const reset = '\x1b[0m';
  
  return `${colorCode}${numberStr}${suitSymbol}${reset}`;
}

// Function to create a card
function createCard(color: Color, number: number, suit: Suit): Card {
  return {
    id: `${color}_${number}_${suit}`,
    color,
    suit,
    number,
    victoryPoints: DeckService.calculateVictoryPoints(number, suit),
    played: false
  };
}

// Set up players
function setupPlayer(color: Color): Player {
  return {
    id: `player_${color}`,
    name: `${color} Player`,
    color,
    hand: [],
    jail: [],
    cards: [],
    victory_points: 0,
    availableStakes: color === Color.Red ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4],
    stake_offset: color === Color.Red ? 1 : -1,
    drawUp: function() {
      if (this.hand.length < 5 && this.cards.length > 0) {
        while (this.hand.length < 5 && this.cards.length > 0) {
          const card = this.cards.shift();
          if (card) this.hand.push(card);
        }
      }
    },
    reset: function(options: { newDeck: boolean; shuffled: boolean }) {
      if (options.newDeck) {
        this.cards = DeckService.createDeck(this.color);
      }
      if (options.shuffled) {
        this.cards = DeckService.shuffleDeck(this.cards);
      }
      this.hand = this.cards.splice(0, 5);
    }
  };
}

// Set up a specific game scenario with interesting strategic choices
function setupGameScenario() {
  const redPlayer = setupPlayer(Color.Red);
  const blackPlayer = setupPlayer(Color.Black);
  
  // Initialize round
  const round = RoundService.initializeRound(redPlayer, blackPlayer, true);
  
  // Give specific cards to players - with strategic hands
  redPlayer.hand = [
    createCard(Color.Red, 7, Suit.Hearts),
    createCard(Color.Red, 7, Suit.Diamonds),
    createCard(Color.Red, 10, Suit.Hearts),
    createCard(Color.Red, 5, Suit.Diamonds),
    createCard(Color.Red, 6, Suit.Hearts)
  ];
  
  blackPlayer.hand = [
    createCard(Color.Black, 8, Suit.Spades),
    createCard(Color.Black, 8, Suit.Clubs),
    createCard(Color.Black, 2, Suit.Spades),
    createCard(Color.Black, 3, Suit.Clubs),
    createCard(Color.Black, 4, Suit.Clubs)
  ];
  
  // Set up some stakes on the board
  round.columns[0].stakedCard = createCard(Color.Black, 5, Suit.Spades);
  round.columns[3].stakedCard = createCard(Color.Red, 9, Suit.Hearts);
  
  // Remove used stake positions from available stakes
  blackPlayer.availableStakes = blackPlayer.availableStakes.filter(s => s !== 0);
  redPlayer.availableStakes = redPlayer.availableStakes.filter(s => s !== 3);
  
  // Make black the active player for this example
  round.activePlayer = blackPlayer;
  round.inactivePlayer = redPlayer;
  
  return { round, redPlayer, blackPlayer };
}

// Calculate the strength of a hand
function calculateHandStrength(cards: Card[], stakeCard?: Card): number {
  // Extract card numbers
  const cardNumbers = cards.map(card => card.number);
  
  // Determine stake number (if applicable)
  const stakeNumber = stakeCard ? stakeCard.number : -1;
  
  // Calculate using card evaluation
  const evalResult = CardEvaluation.evaluateHand(cardNumbers, stakeNumber);
  
  return evalResult.strength;
}

// Helper function to find the longest straight in a list of numbers
function findLongestStraight(numbers: number[]): number {
  if (numbers.length < 2) return 0;
  
  // Sort the numbers
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  let currentRun = 1;
  let bestRun = 1;
  
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i-1] + 1) {
      currentRun++;
      bestRun = Math.max(bestRun, currentRun);
    } else if (sorted[i] !== sorted[i-1]) {
      currentRun = 1;
    }
  }
  
  return bestRun >= 2 ? bestRun : 0;
}

// Format card combinations for display
function describeCombinations(cards: Card[], stakeCard?: Card): string {
  const cardNumbers = cards.map(card => card.number);
  const stakeNumber = stakeCard?.number;
  
  // Count occurrences of each number
  const counts: Record<string, number> = {};
  cardNumbers.forEach(num => {
    counts[num.toString()] = (counts[num.toString()] || 0) + 1;
    // Add stake if it's the same number
    if (stakeNumber === num) counts[num.toString()]++;
  });
  
  // Find combinations
  const combos: string[] = [];
  
  // Check for pairs
  Object.entries(counts).forEach(([num, count]) => {
    if (count >= 2) {
      combos.push(`Pair of ${num}s`);
    }
  });
  
  // Check for straights
  const allNums = [...cardNumbers];
  if (stakeNumber !== undefined && stakeNumber > 0) {
    // Add stake to the numbers for straight detection
    allNums.push(stakeNumber);
  }
  
  // Only check for straight if we don't have pairs
  if (combos.length === 0) {
    const straightLen = findLongestStraight(allNums);
    if (straightLen >= 2) {
      combos.push(`Straight of ${straightLen} cards`);
    }
  }
  
  return combos.length > 0 ? combos.join(', ') : "None";
}

// Main function
async function inspectAIMoves() {
  console.log("AI Move Inspector for Cozen");
  console.log("===========================");
  
  // Set up game scenario
  const { round, redPlayer, blackPlayer } = setupGameScenario();
  
  console.log("\nGame Board State");
  console.log("================");
  console.log("Black's hand:", blackPlayer.hand.map(displayCard).join(' '));
  console.log("Stakes at Col 0:", displayCard(round.columns[0].stakedCard));
  console.log("Stakes at Col 3:", displayCard(round.columns[3].stakedCard));
  
  console.log("\nTesting AIMoveGenerator.generateHandPermutations");
  console.log("==============================================");
  
  // Test the generateHandPermutations method
  const permutations = AIMoveGenerator.generateHandPermutations(blackPlayer.hand);
  console.log(`Generated ${permutations.length} permutations from ${blackPlayer.hand.length} cards`);
  
  // Print first few permutations for inspection
  console.log("\nSample Permutations:");
  permutations.slice(0, 10).forEach((perm, i) => {
    console.log(`${i + 1}. ${perm.map(card => displayCard(card)).join(', ')} (${perm.length} cards)`);
  });
  
  // Count permutations by size
  const sizeCount: Record<number, number> = {};
  permutations.forEach(perm => {
    sizeCount[perm.length] = (sizeCount[perm.length] || 0) + 1;
  });
  
  console.log("\nPermutations by Size:");
  Object.entries(sizeCount).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).forEach(([size, count]) => {
    console.log(`Size ${size}: ${count} permutations`);
  });
  
  console.log("\nGenerating Possible Moves");
  console.log("========================");
  
  // Use the AIMoveGenerator to get all possible moves
  const moves = AIMoveGenerator.generatePossibleMoves(round);
  console.log(`Generated ${moves.length} possible moves`);
  
  // Print the moves by strength
  console.log("\nMoves by Strength:");
  
  // Add a custom strength calculation to the moves
  const movedWithStrength = moves.map(move => {
    // Get the cards
    const cardIds = move.cards;
    const cards = cardIds.map(id => {
      // Try to find the card in player's hand
      const card = blackPlayer.hand.find(c => c.id === id);
      return card;
    }).filter(Boolean) as Card[];
    
    // Get the stake card
    const stakeCard = round.columns[move.column]?.stakedCard;
    const canUseStake = stakeCard && stakeCard.color === blackPlayer.color;
    
    // Calculate strength
    const strength = calculateHandStrength(cards, canUseStake ? stakeCard : undefined);
    
    // Describe combinations
    const combinations = describeCombinations(cards, canUseStake ? stakeCard : undefined);
    
    return {
      ...move,
      calculatedStrength: strength,
      combinations,
      cards: [...cards]
    };
  });
  
  // Sort by strength
  movedWithStrength.sort((a, b) => b.calculatedStrength - a.calculatedStrength);
  
  // Display results
  movedWithStrength.forEach((move, i) => {
    const moveType = move.isStake ? "Stake" : "Wager";
    const cards = move.cards.map(card => displayCard(card)).join(', ');
    
    console.log(`${i + 1}. ${moveType} to column ${move.column} with [${cards}]`);
    console.log(`   Strength: ${move.strength} (Calculated: ${move.calculatedStrength})`);
    console.log(`   Combinations: ${move.combinations}`);
  });
}

// Run the inspection
inspectAIMoves().catch(console.error);