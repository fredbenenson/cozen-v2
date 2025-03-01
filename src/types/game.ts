import { Document, Types } from 'mongoose';
import { Round } from './round';

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

export interface Card {
  id: string;
  color: Color;
  suit: Suit;
  number: number;
  victoryPoints: number;
  played: boolean;
  owner?: any; // Reference to the owner of the card (for stakes)
}

export interface Player {
  id: string;
  username: string;
  color: Color;
  hand: Card[];
  jail: Card[];
  elo: number;
}

export interface Move {
  playerId: string;
  cards: Card[];
  column?: number;
  isStake: boolean;
}

export interface Column {
  positions: Position[];
  stakedCard?: Card;
}

export interface Position {
  card?: Card;
  color: Color;
}

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
