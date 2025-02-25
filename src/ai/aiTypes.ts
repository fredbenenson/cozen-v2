import { Card } from '../types/game';

export enum AIDifficulty {
  NOVICE = 'novice',
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  NIGHTMARE = 'nightmare'
}

// The difficulty scaling factor (matches original implementation)
export const DIFFICULTY_SCALAR = 0.75;

// Base difficulty values - matches the original implementation exactly
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
  cards: string[];
  column: number;
  didStake: boolean;
  isStake?: boolean;  // For compatibility with both naming conventions
  playerName?: string;
  gameId?: string;
  strength?: number;
  value?: number;
  score?: number;
  splitPair?: boolean;
}

/**
 * Result of AI move calculation including the move and stats
 */
export interface AIDecisionResult {
  move: AIMove | null;
  moveIndex: number;
  candidateMoves: AIMove[];
  nodeCount: number;
  elapsedTimeMs: number;
  adjustedDifficulty: number;
}
