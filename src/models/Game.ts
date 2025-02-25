// src/models/Game.ts
import mongoose from 'mongoose';
import { GameState } from '../types/game';

// Game Schema
const GameSchema = new mongoose.Schema<GameState>({
  players: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // Changed from 'Player' to 'User'
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
    ref: 'User' // Changed from 'Player' to 'User'
  }
}, {
  timestamps: true
});

// Create and export model
export const GameModel = mongoose.model<GameState>('Game', GameSchema);

export default GameModel;
