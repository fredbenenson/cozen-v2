import { Card, Color, Suit, CozenState, PlayerID } from '../types/game';
import { Player } from '../types/player';
import { Round } from '../types/round';
import { CardEvaluation } from '../services/cardEvaluation';
import { Ctx } from 'boardgame.io';

/**
 * Evaluates the game state score from a player's perspective
 * Used by the MCTS bot to determine how good a state is
 */
export function evaluateGameState(G: CozenState, perspectivePlayerID: string): number {
  // Convert player ID to color
  const perspectiveColor = perspectivePlayerID === '0' ? 'red' as PlayerID : 'black' as PlayerID;
  
  // Get player objects
  const myPlayer = G.players[perspectiveColor];
  const opponent = G.players[perspectiveColor === 'red' ? 'black' as PlayerID : 'red' as PlayerID];
  
  if (!myPlayer || !opponent) {
    return 0; // Neutral score if players aren't properly defined
  }
  
  // Primary factor: Victory point difference
  let score = myPlayer.victory_points - opponent.victory_points;
  
  // Secondary factors
  score += evaluatePosition(G, perspectiveColor);
  
  return score;
}

/**
 * Evaluates a player's position in the game
 */
function evaluatePosition(G: CozenState, perspectiveColor: string): number {
  const color = perspectiveColor as PlayerID;
  const myPlayer = G.players[color];
  const opponentColor = color === 'red' ? 'black' as PlayerID : 'red' as PlayerID;
  const opponent = G.players[opponentColor];
  
  if (!myPlayer || !opponent) {
    return 0;
  }
  
  let positionScore = 0;
  
  // Evaluate hand strength (pairs, straights)
  positionScore += evaluateHandStrength(myPlayer.hand);
  
  // Evaluate jail cards (captured cards)
  positionScore += myPlayer.jail.reduce((total: number, card: Card) => total + card.victoryPoints * 0.1, 0);
  
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
 * Evaluates the strength of a player's hand using CardEvaluation service
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
 * Convert evaluation score to a form usable by MCTS
 * @param score The raw evaluation score
 * @returns A value between 0 and 1 where higher values are better
 */
export function normalizeScore(score: number): number {
  // Typical scores range from -100 to 100
  // Convert to range 0-1 with a midpoint at 0.5
  const normalized = 0.5 + (score / 200);
  return Math.max(0, Math.min(1, normalized)); // Clamp between 0 and 1
}

/**
 * Objective function for MCTS bot that returns a score between 0 and 1
 * where 1 is the best possible outcome for the current player.
 */
export function mctsObjective(G: CozenState, ctx: Ctx): number {
  try {
    // Make sure we're working with a proper G object
    const gameState = (G as any).G ? (G as any).G : G;
    
    // Get the current player's ID
    const playerID = ctx.currentPlayer || '0';
    
    // Evaluate the game state from this player's perspective
    const score = evaluateGameState(gameState, playerID);
    
    // Normalize to 0-1 range for MCTS
    return normalizeScore(score);
  } catch (error) {
    console.error("Error in mctsObjective:", error);
    return 0.5; // Return neutral score on error
  }
}