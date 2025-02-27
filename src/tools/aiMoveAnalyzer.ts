import { CozenAI, AIDifficulty } from '../ai/cozenAI';
import { AIMove } from '../ai/aiTypes';
import { Color, Suit, Card } from '../types/game';
import { Player } from '../types/player';
import { DeckService } from '../services/deckService';
import { RoundService } from '../services/round';
import { Round } from '../types/round';
import { CardEvaluation } from '../services/cardEvaluation';

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

function displayBoard(round: Round) {
  console.log("\nGame Board State");
  console.log("================");

  // Print black's cards
  console.log("Black's hand:", round.blackPlayer.hand.map(displayCard).join(' '));
  console.log("Black's available stakes:", round.blackPlayer.availableStakes.join(', '));

  // Print stakes row
  console.log("\nStakes row:");
  for (let i = 0; i < 10; i++) {
    if (round.columns[i]?.stakedCard) {
      process.stdout.write(`${i}:${displayCard(round.columns[i].stakedCard)} `);
    } else {
      process.stdout.write(`${i}:__ `);
    }
  }
  console.log();

  // Print red's cards
  console.log("\nRed's hand:", round.redPlayer.hand.map(displayCard).join(' '));
  console.log("Red's available stakes:", round.redPlayer.availableStakes.join(', '));

  // Print victory points
  console.log(`\nVictory Points - Black: ${round.blackPlayer.victory_points}, Red: ${round.redPlayer.victory_points}`);

  // Show active player
  console.log(`\nActive player: ${round.activePlayer.color}`);
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
      // Implementation
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

// Helper to find card by ID in a player's hand
function findCardById(player: Player, cardId: string): Card | undefined {
  return player.hand.find(card => card.id === cardId);
}

// Format move display with card details
function formatMove(move: AIMove, activePlayer: Player, currentRound: Round): string {
  const moveType = move.isStake ? "Stake" : "Wager";

  console.log("DEBUG Move:", move);

  // Try to find actual cards based on ID or extract card info from ID
  const cardDetails = move.cards.map((cardId: string) => {
    // First try to find the actual card
    const card = findCardById(activePlayer, cardId);
    if (card) {
      return displayCard(card);
    }

    // If not found, try to extract info from ID format
    if (typeof cardId === 'string' && cardId.includes('_')) {
      const [color, number, suitStr] = cardId.split('_');
      const suit = suitStr as Suit;
      const num = parseInt(number);
      if (!isNaN(num)) {
        return displayCard({
          id: cardId,
          color: color as Color,
          suit,
          number: num,
          victoryPoints: 0,
          played: false
        });
      }
    }

    // Fallback
    return cardId;
  }).join(', ');

  // For all moves, calculate the strength ourselves
  if (move.cards.length > 0) {
    // Get card numbers from IDs
    const cardNumbers = move.cards.map(cardId => {
      if (typeof cardId === 'string' && cardId.includes('_')) {
        return parseInt(cardId.split('_')[1]);
      }
      return 0;
    }).filter(n => n > 0);

    console.log("Card Numbers:", cardNumbers);

    // Get the stake card for this column
    const stakeColumn = move.column;
    const stakeCard = currentRound.columns[stakeColumn]?.stakedCard;
    const stakeNumber = stakeCard && stakeCard.color === activePlayer.color ? stakeCard.number : -1;

    console.log("Stake Number:", stakeNumber);

    // Calculate strength using CardEvaluation
    const evalResult = CardEvaluation.evaluateHand(cardNumbers, stakeNumber);
    console.log("Calculated Strength:", evalResult.strength);

    // Always set our calculated strength
    move.strength = evalResult.strength;

    // For debugging: add a combination description
    let combos: string[] = [];
    if (evalResult.strength > 0) {
      // Check for pairs
      const counts: Record<string, number> = {};
      cardNumbers.forEach(num => {
        counts[num.toString()] = (counts[num.toString()] || 0) + 1;
        // Add stake if it's the same number
        if (stakeNumber === num) counts[num.toString()]++;
      });

      // Find pairs (numbers that appear at least twice)
      Object.entries(counts).forEach(([num, count]) => {
        if (count >= 2) {
          combos.push(`Pair of ${num}s`);
        }
      });

      // Check for straights
      if (evalResult.strength > 0 && combos.length === 0) {
        const allNums = [...cardNumbers];
        if (stakeNumber > 0 && evalResult.includesStake) {
          allNums.push(stakeNumber);
        }
        allNums.sort((a, b) => a - b);
        const straightLen = findLongestStraight(allNums);
        if (straightLen >= 2) {
          combos.push(`Straight of ${straightLen} cards`);
        }
      }
    }

    console.log("Combinations:", combos.length > 0 ? combos.join(', ') : "None");
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

  return `${moveType} to column ${move.column} with cards [${cardDetails}] - Score: ${move.score || 0}, Strength: ${move.strength || 0}`;
}

// Main function
async function analyzeAIMoves() {
  console.log("AI Move Analyzer for Cozen");
  console.log("===========================");

  // Set up game scenario
  const { round, redPlayer, blackPlayer } = setupGameScenario();

  // Display the board
  displayBoard(round);

  // Initialize AI for the active player (Black in this case)
  const ai = new CozenAI({ round }, round.activePlayer, AIDifficulty.MEDIUM, 4);
  ai.enableDebug();

  console.log("\nCalculating AI moves...");
  // Calculate moves
  const result = ai.calculateMoveWithStats();

  console.log("\nTop 10 candidate moves:");
  console.log("====================");

  // Fix up the candidate moves first by recalculating strength
  console.log("\nRecalculating strengths for all candidate moves...");
  result.candidateMoves.forEach(move => {
    if (move.cards.length > 0) {
      // Extract card numbers
      const cardNumbers = move.cards.map(cardId => {
        if (typeof cardId === 'string' && cardId.includes('_')) {
          return parseInt(cardId.split('_')[1]);
        }
        return 0;
      }).filter(n => n > 0);

      // Get stake card
      const stakeColumn = move.column;
      const stakeCard = round.columns[stakeColumn]?.stakedCard;
      const stakeNumber = stakeCard && stakeCard.color === round.activePlayer.color ? stakeCard.number : -1;

      // Calculate strength
      const evalResult = CardEvaluation.evaluateHand(cardNumbers, stakeNumber);

      // Update move with correct strength
      move.strength = evalResult.strength;
    }
  });

  // Sort moves by actual strength for display
  const sortedMoves = [...result.candidateMoves].sort((a, b) => {
    // First by strength (descending)
    if ((b.strength || 0) !== (a.strength || 0)) {
      return (b.strength || 0) - (a.strength || 0);
    }
    // Then by value of cards (descending)
    return (b.value || 0) - (a.value || 0);
  });

  // Display top 10 moves
  const topMoves = sortedMoves.slice(0, 10);
  topMoves.forEach((move, index) => {
    console.log(`${index + 1}. ${formatMove(move, round.activePlayer, round)}`);
  });

  console.log("\nSelected move (based on AI's score, not just strength):");
  console.log(`${result.moveIndex + 1}. ${formatMove(result.candidateMoves[result.moveIndex], round.activePlayer, round)}`);
  console.log("Nodes evaluated:", result.nodeCount);
  console.log("Time taken:", result.elapsedTimeMs.toFixed(2), "ms");
}

// Run the analysis
analyzeAIMoves().catch(console.error);
