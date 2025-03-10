import { Document, Types } from 'mongoose';
import { Round } from './round';

// Declare boardgame.io modules to prevent TypeScript errors
declare module 'boardgame.io';
declare module 'boardgame.io/server';
declare module 'boardgame.io/react';
declare module 'boardgame.io/ai';
declare module 'boardgame.io/multiplayer';
declare module 'boardgame.io/core';

export enum Color {
  Red = 'red',
  Black = 'black'
}

export enum Suit {
  Hearts = 'hearts',
  Diamonds = 'diamonds',
  Clubs = 'clubs',
  Spades = 'spades'
}

export enum Rank {
  Ace = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13
}

// Map to display card symbols
export const RankSymbols: { [key in Rank]: string } = {
  [Rank.Ace]: 'A',
  [Rank.Two]: '2',
  [Rank.Three]: '3', 
  [Rank.Four]: '4',
  [Rank.Five]: '5',
  [Rank.Six]: '6',
  [Rank.Seven]: '7',
  [Rank.Eight]: '8',
  [Rank.Nine]: '9',
  [Rank.Ten]: '10',
  [Rank.Jack]: 'J',
  [Rank.Queen]: 'Q',
  [Rank.King]: 'K'
};

// Map for suit symbols
export const SuitSymbols: { [key in Suit]: string } = {
  [Suit.Hearts]: '♥',
  [Suit.Diamonds]: '♦',
  [Suit.Clubs]: '♣',
  [Suit.Spades]: '♠'
};

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
  card?: Card | Card[]; // Can hold either a single card or an array of cards
  owner: PlayerID;
  n: number;
  coord: [number, number];
}

// Column on the board
export interface Column {
  positions: Position[];
  stakedCard?: Card;
}

// Player information for boardgame.io
export interface CozenPlayer {
  hand: Card[];
  jail: Card[];
  cards: Card[];
  victory_points: number;
  availableStakes: number[];
  stake_offset: number;
}

// The main game state for boardgame.io
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
  message?: string;
  developerMode?: boolean;
  victoryPointScores: {
    red: number;
    black: number;
  };
}

// API/Database interfaces

export interface DbPlayer {
  id: string;
  username: string;
  color: Color;
  hand: Card[];
  jail: Card[];
  elo: number;
}

export interface GameMove {
  playerId: string;
  cards: Card[];
  column?: number;
  isStake: boolean;
}

// Add Move type for backward compatibility with existing code
export type Move = GameMove;

// Add Player type alias that points to the Player interface in player.ts
// This helps with backward compatibility
import { Player as PlayerType } from './player';
export type Player = PlayerType;

// Base game state without Mongoose-specific fields
export interface BaseGameState {
  players: Types.ObjectId[];
  currentPlayerIndex: number;
  board: Column[];
  round: Round | null;
  status: 'waiting' | 'in_progress' | 'complete';
  winner?: Types.ObjectId;
  decks?: {
    [Color.Red]: Card[];
    [Color.Black]: Card[];
  };
}

// Mongoose document interface
export interface GameState extends Document, BaseGameState {
  createdAt: Date;
  updatedAt: Date;
}
