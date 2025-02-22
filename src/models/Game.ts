import mongoose from 'mongoose';
import { BaseGameState, GameState, Color } from '../types/game';
import bcrypt from 'bcryptjs';

// Player Schema
const PlayerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: false
  },
  color: {
    type: String,
    enum: Object.values(Color),
    default: null
  },
  elo: {
    type: Number,
    default: 1200
  },
  currentGames: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game'
  }],
  hand: [{
    type: mongoose.Schema.Types.Mixed
  }],
  jail: [{
    type: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Add password hashing middleware
PlayerSchema.pre('save', async function(next) {
  const player = this;
  if (!player.isModified('password')) return next();
  try {
    if (player.password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(player.password, salt);
      player.password = hash;
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Add password verification method
PlayerSchema.methods.verifyPassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Game Schema
const GameSchema = new mongoose.Schema<GameState>({
  players: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    }],
    required: true,
    validate: {
      validator: function(players: mongoose.Types.ObjectId[]) {
        return players.length > 0;
      },
      message: 'At least one player is required'
    }
  },
  currentPlayerIndex: {
    type: Number,
    default: 0
  },
  board: [{
    type: mongoose.Schema.Types.Mixed
  }],
  round: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'complete'],
    default: 'waiting'
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }
}, {
  timestamps: true
});

// Interfaces
export interface IPlayer extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  password?: string;
  color: Color | null;
  elo: number;
  currentGames: mongoose.Types.ObjectId[];
  hand: any[];
  jail: any[];
  createdAt: Date;
  updatedAt: Date;
  verifyPassword(password: string): Promise<boolean>;
}

// Create and export models
export const PlayerModel = mongoose.model<IPlayer>('Player', PlayerSchema);
export const GameModel = mongoose.model<GameState>('Game', GameSchema);
