// src/types/evaluation.ts

export interface HandEvaluationResult {
  value: number;
  highCardList: number[];
  includesStake: boolean;
}

export interface WinningHandResult {
  hand1Wins: boolean;
  stakeGoesToJail: boolean;
  winningCard: string;
  jailHand: number[];
}

export type Hand = number[];