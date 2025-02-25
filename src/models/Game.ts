// src/models/Game.ts
import mongoose, { Schema, Types } from 'mongoose';
import { GameState } from '../types/game';

// Game Schema
const GameSchema = new Schema<GameState>({
  players: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    required: true,
    validate: {
      validator: function(players: Types.ObjectId[]) {
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
    type: Schema.Types.Mixed
  }],
  round: {
    type: Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'complete'],
    default: 'waiting'
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create and export model
export const GameModel = mongoose.model<GameState>('Game', GameSchema);

export default GameModel;
