// src/tests/utils/mockMongoose.ts
import { Types } from 'mongoose';
import { IUser } from '../../models/User';
import { Color } from '../../types/game';
import { Player } from '../../types/player';
import { PlayerFactory } from '../../factories/PlayerFactory';

// Basic mock of ValidationError since mongoose.Error.ValidationError is complex
class MockValidationError extends Error {
  errors: { [key: string]: any };
  name: string;

  constructor() {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = {};
    this.addError = this.addError.bind(this);
  }

  addError(path: string, error: any) {
    this.errors[path] = error;
  }
}

export const createMockMongooseDocument = () => ({
  $assertPopulated: jest.fn(),
  $clone: jest.fn(),
  $isDeleted: jest.fn(),
  $isEmpty: jest.fn(),
  $isValid: jest.fn(),
  $model: jest.fn(),
  depopulate: jest.fn(),
  equals: jest.fn(),
  get: jest.fn(),
  init: jest.fn(),
  isModified: jest.fn(),
  markModified: jest.fn(),
  populate: jest.fn(),
  save: jest.fn().mockResolvedValue(true),
  toJSON: jest.fn(),
  toObject: jest.fn(),
  validate: jest.fn(),
  errors: new MockValidationError()
});

// Create a mock user (database model)
export const createMockUser = (overrides?: Partial<IUser>): IUser => {
  const defaultUser = {
    _id: new Types.ObjectId(),
    username: `testuser_${Math.random().toString(36).substring(7)}`,
    password: undefined,
    color: Color.Red,
    elo: 1200,
    currentGames: [],
    hand: [],
    jail: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    verifyPassword: jest.fn().mockResolvedValue(true),
    ...createMockMongooseDocument(),
    ...overrides
  } as IUser;

  return defaultUser;
};

// Create a mock player (game object)
export const createMockGamePlayer = (color: Color, name?: string): Player => {
  return PlayerFactory.createMockPlayer(color, name);
};
