// src/tests/testUtils.ts
import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';
import { Color, Suit, Player, Card } from '../types/game';

export const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: new Types.ObjectId().toString(),
  username: `testuser_${Math.random().toString(36).substring(7)}`,
  color: Math.random() > 0.5 ? Color.Red : Color.Black,
  hand: [],
  jail: [],
  elo: 1200,
  ...overrides
});

export const createMockCard = (overrides: Partial<Card> = {}): Card => ({
  id: uuidv4(),
  color: Math.random() > 0.5 ? Color.Red : Color.Black,
  suit: Object.values(Suit)[Math.floor(Math.random() * 4)],
  number: Math.floor(Math.random() * 13) + 2, // 2-14
  victoryPoints: 0,
  played: false,
  ...overrides
});
