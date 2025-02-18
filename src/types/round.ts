// src/types/round.ts

import { Card, Color } from './game';
import { Player } from './player';

export interface Position {
  card?: Card;
  owner: Player;
  n: number;
  coord: [number, number]; // [row, column]
}

export interface Column {
  positions: Position[];
  stakedCard?: Card;
}

export interface Round {
  redPlayer: Player;
  blackPlayer: Player;
  activePlayer: Player;
  inactivePlayer: Player;
  firstRound: boolean;
  board: Position[][];
  columns: Column[];
  state: RoundState;
  turn: number;
  cardsJailed: number;
  victoryPointScores: {
    red: number;
    black: number;
  };
  firstStakes: {
    red: Card[];
    black: Card[];
  };
}

export type RoundState = 'running' | 'last_play' | 'complete';

export interface Move {
  cards: string[]; // card_ids
  column: number;
  didStake: boolean;
  playerName: string;
  gameId: string;
}

export interface StakeMove extends Move {
  didStake: true;
}

export interface WagerMove extends Move {
  didStake: false;
}