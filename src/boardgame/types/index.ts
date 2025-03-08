import { Color, Suit } from '../../types/game';

export type PlayerID = 'red' | 'black';

// Card definition
export interface Card {
  id: string;
  color: Color;
  suit: Suit;
  number: number;
  victoryPoints: number;
  played: boolean;
  owner?: PlayerID;
}

// Position on the board
export interface Position {
  card?: Card | Card[]; // Can now hold either a single card or an array of cards
  owner: PlayerID;
  n: number;
  coord: [number, number];
}

// Column on the board
export interface Column {
  positions: Position[];
  stakedCard?: Card;
}

// Player information
export interface CozenPlayer {
  hand: Card[];
  jail: Card[];
  cards: Card[];
  victory_points: number;
  availableStakes: number[];
  stake_offset: number;
}

// The G object - main game state
export interface CozenState {
  players: {
    red: CozenPlayer;
    black: CozenPlayer;
  };
  board: Column[];
  firstStakes: {
    red: Card[];
    black: Card[];
  };
  roundState: 'running' | 'last_play' | 'complete';
  activePlayer: PlayerID;
  inactivePlayer: PlayerID;
  cardsJailed: number;
  isFirstRound: boolean;
  turnCount: number;
  victoryPointScores: {
    red: number;
    black: number;
  };
}