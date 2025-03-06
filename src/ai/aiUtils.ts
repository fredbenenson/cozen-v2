import { Card, Color, Suit } from '../types/game';
import { Player } from '../types/player';
import { Round, Column } from '../types/round';
import { AIMove, AIDifficulty, DIFFICULTY_VALUES } from './aiTypes';

/**
 * Generates all possible stake moves for a player
 */
export function generateStakeMoves(round: Round, player: Player): AIMove[] {
  // If no available stake positions, return empty array
  if (player.availableStakes.length === 0) {
    return [];
  }

  const moves: AIMove[] = [];
  const validCards = player.hand.filter(card => card.color === player.color);

  // Generate a stake move for each card in hand and each available stake position
  for (const card of validCards) {
    for (const column of player.availableStakes) {
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
  // Count cards in positions owned by the player
  return column.positions
    .filter(pos => pos.owner.color === player.color && pos.card !== undefined)
    .length;
}

/**
 * Count opponent cards in a column
 */
function countOpponentCardsInColumn(column: Column, player: Player): number {
  // Count cards in positions owned by the opponent
  return column.positions
    .filter(pos => pos.owner.color !== player.color && pos.card !== undefined)
    .length;
}

/**
 * Generates all valid card combinations (power set without the empty set)
 */
export function generateCardCombinations(cards: Card[]): Card[][] {
  const result: Card[][] = [];
  
  // Generate power set using binary counting
  const n = cards.length;
  // Skip the empty set (i=0)
  for (let i = 1; i < Math.pow(2, n); i++) {
    const combination: Card[] = [];
    for (let j = 0; j < n; j++) {
      // If jth bit is set, include the card
      if ((i & (1 << j)) !== 0) {
        combination.push(cards[j]);
      }
    }
    result.push(combination);
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
  
  // Use a simplified version of card evaluation to estimate hand strength
  let score = 0;
  
  // Handle pairs (3 points each)
  const numberCounts = new Map<number, number>();
  for (const card of allCards) {
    numberCounts.set(card.number, (numberCounts.get(card.number) || 0) + 1);
  }
  
  // Count pairs (note: this doesn't handle more than 1 pair correctly but is a good estimate)
  for (const [_, count] of numberCounts.entries()) {
    if (count >= 2) {
      score += 3; // 3 points per pair
      break; // Only count one pair for simplicity
    }
  }
  
  // Simple check for straights
  const cardNumbers = Array.from(allCards).map(c => c.number).sort((a, b) => a - b);
  let maxStraightLength = 1;
  let currentStraightLength = 1;
  
  for (let i = 1; i < cardNumbers.length; i++) {
    if (cardNumbers[i] === cardNumbers[i-1] + 1) {
      currentStraightLength++;
    } else if (cardNumbers[i] !== cardNumbers[i-1]) {
      currentStraightLength = 1;
    }
    maxStraightLength = Math.max(maxStraightLength, currentStraightLength);
  }
  
  // Add points for straights (1 point per card in straight)
  if (maxStraightLength >= 2) {
    score += maxStraightLength;
  }
  
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
 * Evaluates the strength of a player's hand
 */
function evaluateHandStrength(hand: Card[]): number {
  let strength = 0;
  
  // Check for pairs
  const numberCounts = new Map<number, number>();
  for (const card of hand) {
    numberCounts.set(card.number, (numberCounts.get(card.number) || 0) + 1);
  }
  
  // Count pairs (3 points each)
  for (const [_, count] of numberCounts.entries()) {
    if (count >= 2) {
      strength += 3;
    }
  }
  
  // Check for straights
  const cardNumbers = Array.from(hand).map(c => c.number).sort((a, b) => a - b);
  let maxStraightLength = 1;
  let currentStraightLength = 1;
  
  for (let i = 1; i < cardNumbers.length; i++) {
    if (cardNumbers[i] === cardNumbers[i-1] + 1) {
      currentStraightLength++;
    } else if (cardNumbers[i] !== cardNumbers[i-1]) {
      currentStraightLength = 1;
    }
    maxStraightLength = Math.max(maxStraightLength, currentStraightLength);
  }
  
  // Add points for straights (1 point per card in straight)
  if (maxStraightLength >= 2) {
    strength += maxStraightLength;
  }
  
  return strength;
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