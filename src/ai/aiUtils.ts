import { Card, Color, Suit } from '../types/game';
import { Player } from '../types/player';
import { Round, Column } from '../types/round';
import { AIMove, AIDifficulty, DIFFICULTY_VALUES } from './aiTypes';
import { StakeService } from '../services/stakeService';
import { CardEvaluation } from '../services/cardEvaluation';

/**
 * Generates all possible stake moves for a player
 * Uses StakeService to determine valid stake columns
 */
export function generateStakeMoves(round: Round, player: Player): AIMove[] {
  // Get valid stake columns from StakeService
  const validStakeColumns = StakeService.getValidStakeColumns(player, round);
  
  // If no valid stake positions, return empty array
  if (validStakeColumns.length === 0) {
    return [];
  }

  const moves: AIMove[] = [];
  const validCards = player.hand.filter(card => card.color === player.color);

  // Generate a stake move for each card in hand and each valid stake column
  for (const card of validCards) {
    for (const column of validStakeColumns) {
      moves.push({
        cards: [card.id],
        column,
        didStake: true,
        isStake: true,
        score: evaluateStakeMove(card, column, round)
      });
    }
  }

  return moves;
}

/**
 * Generates all possible wager moves for a player
 */
export function generateWagerMoves(round: Round, player: Player): AIMove[] {
  const moves: AIMove[] = [];
  const validCards = player.hand.filter(card => card.color === player.color);
  
  // Find columns with stakes
  const stakedColumns = round.columns
    .filter(col => col.stakedCard !== undefined)
    .map((col, index) => index);
  
  if (stakedColumns.length === 0 || validCards.length === 0) {
    return [];
  }

  // Generate all possible combinations of cards from the hand
  const cardCombinations = generateCardCombinations(validCards);
  
  // For each staked column, try each card combination
  for (const column of stakedColumns) {
    for (const combination of cardCombinations) {
      if (combination.length > 0) {
        // Skip combinations that would exceed 5 cards in a column
        const existingCards = countPlayerCardsInColumn(round.columns[column], player);
        
        if (existingCards + combination.length > 5) {
          continue;
        }
        
        moves.push({
          cards: combination.map(card => card.id),
          column,
          didStake: false,
          isStake: false,
          score: evaluateWagerMove(combination, column, round, player)
        });
      }
    }
  }

  return moves;
}

/**
 * Count how many cards a player has in a column
 */
function countPlayerCardsInColumn(column: Column, player: Player): number {
  // Add null check to prevent TypeError
  if (!column || !column.positions) {
    return 0;
  }
  
  // Count cards in positions owned by the player
  return column.positions
    .filter(pos => pos.owner.color === player.color && pos.card !== undefined)
    .length;
}

/**
 * Count opponent cards in a column
 */
function countOpponentCardsInColumn(column: Column, player: Player): number {
  // Add null check to prevent TypeError
  if (!column || !column.positions) {
    return 0;
  }
  
  // Count cards in positions owned by the opponent
  return column.positions
    .filter(pos => pos.owner.color !== player.color && pos.card !== undefined)
    .length;
}

/**
 * Generates all valid card combinations (singles, pairs, and runs)
 */
export function generateCardCombinations(cards: Card[]): Card[][] {
  const result: Card[][] = [];
  
  // Step 1: Generate singles (individual cards)
  for (const card of cards) {
    result.push([card]);
  }
  
  // Step 2: Generate pairs
  // Group cards by number to find pairs
  const numberGroups = new Map<number, Card[]>();
  for (const card of cards) {
    if (!numberGroups.has(card.number)) {
      numberGroups.set(card.number, []);
    }
    numberGroups.get(card.number)!.push(card);
  }
  
  // Add pairs to the result
  for (const [_, sameNumberCards] of numberGroups.entries()) {
    if (sameNumberCards.length >= 2) {
      // Generate all possible pairs from cards of the same number
      for (let i = 0; i < sameNumberCards.length - 1; i++) {
        for (let j = i + 1; j < sameNumberCards.length; j++) {
          result.push([sameNumberCards[i], sameNumberCards[j]]);
        }
      }
      
      // If more than 2 cards of the same number, also include triples
      if (sameNumberCards.length >= 3) {
        for (let i = 0; i < sameNumberCards.length - 2; i++) {
          for (let j = i + 1; j < sameNumberCards.length - 1; j++) {
            for (let k = j + 1; k < sameNumberCards.length; k++) {
              result.push([sameNumberCards[i], sameNumberCards[j], sameNumberCards[k]]);
            }
          }
        }
      }
      
      // If 4 cards of the same number, also include quadruples
      if (sameNumberCards.length >= 4) {
        result.push([...sameNumberCards.slice(0, 4)]);
      }
    }
  }
  
  // Step 3: Generate runs (straights)
  // Sort cards by number for run detection
  const sortedCards = [...cards].sort((a, b) => a.number - b.number);
  
  // Find potential runs of consecutive numbers
  for (let startIdx = 0; startIdx < sortedCards.length - 1; startIdx++) {
    // Try to build a run starting from this card
    const run = [sortedCards[startIdx]];
    let currentNumber = sortedCards[startIdx].number;
    
    for (let nextIdx = startIdx + 1; nextIdx < sortedCards.length; nextIdx++) {
      // Skip duplicate numbers - we only want consecutive ascending values
      if (sortedCards[nextIdx].number === currentNumber) {
        continue;
      }
      
      // If the next card is exactly one number higher, add it to the run
      if (sortedCards[nextIdx].number === currentNumber + 1) {
        run.push(sortedCards[nextIdx]);
        currentNumber = sortedCards[nextIdx].number;
      } else {
        // Not consecutive, break out
        break;
      }
    }
    
    // Only add runs of at least 2 cards
    if (run.length >= 2) {
      result.push(run);
      
      // Also add all valid sub-runs of length >= 2
      for (let i = 0; i < run.length - 1; i++) {
        for (let j = i + 2; j <= run.length; j++) {
          // Avoid duplicates (e.g., don't add the full run again)
          if (j - i !== run.length) {
            result.push(run.slice(i, j));
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * Evaluates a stake move's preliminary score
 */
function evaluateStakeMove(card: Card, column: number, round: Round): number {
  // Basic heuristic: stake higher value cards (they're worth more VP)
  let score = card.victoryPoints;
  
  // Place special Kings (worth 70VP) more carefully
  if (card.victoryPoints >= 70) {
    score -= 50; // Discourage staking Kings worth 70VP
  }
  
  return score;
}

/**
 * Evaluates a wager move's preliminary score using card evaluation rules
 */
function evaluateWagerMove(cards: Card[], column: number, round: Round, player: Player): number {
  // Check if column exists
  if (!round.columns[column]) return 0;
  
  const stake = round.columns[column].stakedCard;
  if (!stake) return 0;
  
  // Get number of opponent cards in this column
  const opponentCardCount = countOpponentCardsInColumn(round.columns[column], player);
    
  // If opponent has no cards, this is free VP
  if (opponentCardCount === 0) {
    // Value is sum of VPs in stake if it's opponent's
    if (stake.color !== player.color) {
      return stake.victoryPoints * 2; // Double incentive to capture stakes
    }
    return 1; // Low incentive to protect own stake with no opponent
  }
  
  // Estimate strength of our cards (including existing cards)
  const existingCards: Card[] = getPlayerCardsInColumn(round.columns[column], player);
    
  const allCards = [...existingCards, ...cards];
  
  // Extract card numbers from Card objects
  const cardNumbers = allCards.map(card => card.number);
  
  // Use the canonical card evaluation service with stake number if it belongs to player
  const stakeNumber = stake.color === player.color ? stake.number : -1;
  const evaluation = CardEvaluation.evaluateHand(cardNumbers, stakeNumber);
  
  // Get hand strength from evaluation
  let score = evaluation.strength;
  
  // If stake belongs to opponent and we're likely to win, add extra incentive
  if (stake.color !== player.color) {
    score += stake.victoryPoints;
  }
  
  // Discourage splitting pairs from hand
  const cardNumbers2 = cards.map(c => c.number);
  const uniqueNumbers = new Set(cardNumbers2);
  if (uniqueNumbers.size < cardNumbers2.length) {
    score += 2; // Slight bonus for keeping pairs together
  }
  
  return score;
}

/**
 * Get a player's cards in a column
 */
function getPlayerCardsInColumn(column: Column, player: Player): Card[] {
  // Add null check to prevent TypeError
  if (!column || !column.positions) {
    return [];
  }
  
  return column.positions
    .filter(pos => pos.owner.color === player.color && pos.card !== undefined)
    .map(pos => pos.card!)
    .filter(card => card !== undefined);
}

/**
 * Evaluates the game state from the perspective of the given player
 */
export function evaluateGameState(round: Round, perspectiveColor: string): number {
  const myPlayer = perspectiveColor === Color.Red ? round.redPlayer : round.blackPlayer;
  const opponent = perspectiveColor === Color.Red ? round.blackPlayer : round.redPlayer;
  
  // Primary factor: Victory point difference
  let score = myPlayer.victory_points - opponent.victory_points;
  
  // Add position evaluation
  score += evaluatePosition(round, perspectiveColor);
  
  return score;
}

/**
 * Evaluates a player's position in the game
 */
function evaluatePosition(round: Round, perspectiveColor: string): number {
  const myPlayer = perspectiveColor === Color.Red ? round.redPlayer : round.blackPlayer;
  const opponent = perspectiveColor === Color.Red ? round.blackPlayer : round.redPlayer;
  
  let positionScore = 0;
  
  // Evaluate hand strength (pairs, straights)
  positionScore += evaluateHandStrength(myPlayer.hand);
  
  // Evaluate jail cards (captured cards)
  positionScore += evaluateJail(myPlayer.jail);
  
  // Evaluate opponent's hand for poison Kings
  const poisonKings = opponent.hand.filter(card => 
    card.number === 13 && card.victoryPoints >= 70
  ).length;
  positionScore -= poisonKings * 10; // Big penalty for opponent having poison Kings
  
  // More available stakes is good
  positionScore += myPlayer.availableStakes.length * 0.5;
  
  // More cards in hand is generally good
  positionScore += (myPlayer.hand.length - opponent.hand.length) * 0.2;
  
  return positionScore;
}

/**
 * Evaluates the strength of a player's hand using the canonical CardEvaluation service
 */
function evaluateHandStrength(hand: Card[]): number {
  // Extract card numbers from Card objects
  const cardNumbers = hand.map(card => card.number);
  
  // Use the canonical card evaluation service with no stake card
  const result = CardEvaluation.evaluateHand(cardNumbers, -1);
  
  // Return the strength value from the evaluation
  return result.strength;
}

/**
 * Evaluates the value of cards in jail (captured cards)
 */
function evaluateJail(jail: Card[]): number {
  return jail.reduce((total, card) => total + card.victoryPoints * 0.1, 0);
}

/**
 * Creates a deep copy of a Round object
 */
export function cloneRound(round: Round): Round {
  // This is a simplified clone function - in a real implementation,
  // you'd need to ensure all objects and nested structures are properly cloned
  return JSON.parse(JSON.stringify(round));
}

/**
 * Generates a Poisson-distributed random integer
 */
export function poissonRandom(lambda: number): number {
  let L = Math.exp(-lambda);
  let p = 1.0;
  let k = 0;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
}

/**
 * Identify and flag moves that would split potential pairs in hand
 */
export function flagSplitPairs(moves: AIMove[], hand: Card[]): void {
  if (!moves || !hand) return;

  moves.forEach(move => {
    if (move.isStake && move.cards.length > 0) {
      // Get the card ID
      const cardId = move.cards[0];
      
      // Find the card in the hand
      const card = hand.find(c => c.id === cardId);
      
      if (!card) return;
      
      // Check if staking would split a pair
      const matchingCards = hand.filter(c => c.number === card.number);
      if (matchingCards.length > 1) {
        move.splitPair = true;
      }
    }
  });
}

/**
 * Hide "poison" (high value) cards from the opponent in evaluation
 * Used to avoid biasing AI decisions
 */
export function hidePoison(round: Round, playerColor: string): void {
  if (!round || !round.redPlayer || !round.blackPlayer) return;

  const opponentPlayer = playerColor === Color.Red ? round.blackPlayer : round.redPlayer;

  // If the opponent has kings in hand, temporarily reduce their value for evaluation
  opponentPlayer.hand.forEach(card => {
    if (card.number === 13) { // King
      (card as any).originalValue = card.victoryPoints;
      card.victoryPoints = 10; // Reduce to normal face card value
    }
  });
}

/**
 * Restore original values of "poison" cards after evaluation
 */
export function restorePoison(round: Round, playerColor: string): void {
  if (!round || !round.redPlayer || !round.blackPlayer) return;

  const opponentPlayer = playerColor === Color.Red ? round.blackPlayer : round.redPlayer;

  // Restore original values
  opponentPlayer.hand.forEach(card => {
    if ((card as any).originalValue !== undefined) {
      card.victoryPoints = (card as any).originalValue;
      delete (card as any).originalValue;
    }
  });
}