import { Card } from '../types/game';

export enum AIDifficulty {
  NOVICE = 'novice',
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  NIGHTMARE = 'nightmare'
}

// The difficulty scaling factor
export const DIFFICULTY_SCALAR = 0.75;

// Base difficulty values
export const DIFFICULTY_VALUES: Record<AIDifficulty, number> = {
  [AIDifficulty.NOVICE]: 1 / (DIFFICULTY_SCALAR ** 4),
  [AIDifficulty.EASY]: 0.7 / (DIFFICULTY_SCALAR ** 4),
  [AIDifficulty.MEDIUM]: 0.5 / (DIFFICULTY_SCALAR ** 4),
  [AIDifficulty.HARD]: 0.3 / (DIFFICULTY_SCALAR ** 4),
  [AIDifficulty.NIGHTMARE]: 0.1 / (DIFFICULTY_SCALAR ** 4)
};

/**
 * Represents a move with additional metadata for AI evaluation
 */
export interface AIMove {
  cards: string[];     // Card IDs
  column: number;      // Target column
  didStake: boolean;   // Legacy compatibility
  isStake: boolean;    // Whether this is a stake move
  playerName?: string;
  gameId?: string;
  strength?: number;   // Hand strength
  value?: number;      // Point value
  score?: number;      // Computed score for minimax
  splitPair?: boolean; // Whether this move splits a pair
}

/**
 * Result of AI decision-making process
 */
export interface AIDecisionResult {
  move: AIMove | null;
  searchDepth: number;
  nodesExplored: number;
  timeElapsed: number;
  candidateMoves: number;
}

/**
 * Represents a node in the minimax visualization tree
 */
export interface GameNode {
  source: string;         // ID of the source node
  target: string;         // ID of the target node
  n: number;              // Move number
  depth: number;          // Depth in the tree
  score: number;          // Current evaluation score
  minimaxResult?: number; // Minimax result after traversal
  childState: string;     // Identifier for the state after this move
  alphaBeta: string;      // Alpha-beta bounds for this node
  beatAlphaBeta: boolean; // Whether this move beat the alpha-beta bounds
  maximizing: boolean;    // Whether this node is a maximizing node
  cards: string;          // Cards played in this move
  column: number;         // Column targeted in this move
  isStake: boolean;       // Whether this is a stake move
  label?: string;         // Custom label for the node
  cardColor?: string;     // Card color for debugging
}