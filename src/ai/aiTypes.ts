import { Move } from '../types/game';
import { Round } from '../types/round';

export enum AIDifficulty {
  NOVICE = 'novice',
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  NIGHTMARE = 'nightmare'
}

// The difficulty scaling factor
export const DIFFICULTY_SCALAR = 0.75;

// Base difficulty values - lower numbers create smarter AI
export const DIFFICULTY_VALUES: Record<AIDifficulty, number> = {
  [AIDifficulty.NOVICE]: 1 / (DIFFICULTY_SCALAR ** 4),
  [AIDifficulty.EASY]: 0.7 / (DIFFICULTY_SCALAR ** 4),
  [AIDifficulty.MEDIUM]: 0.5 / (DIFFICULTY_SCALAR ** 4),
  [AIDifficulty.HARD]: 0.3 / (DIFFICULTY_SCALAR ** 4),
  [AIDifficulty.NIGHTMARE]: 0.1 / (DIFFICULTY_SCALAR ** 4)
};

/**
 * Represents a possible move with additional metadata for AI evaluation
 */
export interface MoveOption {
  cards: string[];
  column: number;
  isStake: boolean;
  strength?: number;
  value?: number;
  score?: number;
  splitPair?: boolean;
}

/**
 * Node in the game tree for minimax search
 */
export interface GameNode {
  source: string;
  target: string;
  n: number;
  depth: number;
  score: number;
  childState: string;
  alphaBeta: string;
  beatAlphaBeta: boolean;
  maximizing: boolean;
  cards: string;
  column: number;
  isStake: boolean;
}
