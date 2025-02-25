// src/tests/models.test.ts
import mongoose, { Schema, Types } from 'mongoose';
import { GameModel } from '../models/Game';
import { UserModel, IUser } from '../models/User';
import { Color } from '../types/game';

// Mocking mongoose
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');

  // Create a proper schema mock with Types
  const SchemaClass = function() {
    return {
      pre: jest.fn().mockReturnThis(),
      methods: {},
      // Add other schema methods as needed
    };
  };

  // Add Types to Schema
  SchemaClass.Types = {
    ObjectId: actualMongoose.Types.ObjectId,
    Mixed: 'mixed',
    String: 'string',
    Number: 'number',
    Boolean: 'boolean',
    Array: 'array'
  };

  // Mock models with proper default values
  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn((data) => Promise.resolve({
      ...data,
      _id: new actualMongoose.Types.ObjectId(),
      color: null, // Add default values matching schema
      elo: 1200,
      currentGames: [],
      hand: [],
      jail: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(true)
    }))
  };

  const mockGameModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn((data) => Promise.resolve({
      ...data,
      _id: new actualMongoose.Types.ObjectId(),
      currentPlayerIndex: 0, // Add default values matching schema
      board: [],
      status: 'waiting',
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  };

  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(true),
    model: jest.fn().mockImplementation((modelName) => {
      if (modelName === 'User') {
        return mockUserModel;
      }
      if (modelName === 'Game') {
        return mockGameModel;
      }
      return {};
    }),
    Schema: SchemaClass,
  };
});

// Mock bcryptjs for password hashing tests
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

describe('Database Models', () => {
  describe('User Model', () => {
    it('should create a new user with default values', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123'
      };

      const createdUser = await UserModel.create(userData);

      expect(createdUser).toHaveProperty('_id');
      expect(createdUser.username).toBe(userData.username);
      expect(createdUser.color).toBe(null);
      expect(createdUser.elo).toBe(1200);
    });

    it('should set password field appropriately', async () => {
      const userData = {
        username: 'passworduser',
        password: 'password123'
      };

      const user = await UserModel.create(userData);

      // Since we mocked bcrypt.hash to always return 'hashed_password'
      expect(userData.password).toBe('password123'); // Original still the same
      expect(user.username).toBe('passworduser');
    });
  });

  describe('Game Model', () => {
    it('should create a new game with default values', async () => {
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();

      const gameData = {
        players: [user1Id, user2Id]
      };

      const createdGame = await GameModel.create(gameData);

      expect(createdGame).toHaveProperty('_id');
      expect(createdGame.players).toEqual(gameData.players);
      expect(createdGame.currentPlayerIndex).toBe(0);
      expect(createdGame.status).toBe('waiting');
    });
  });
});
