// src/models/User.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Color } from '../types/game';

// User Schema
const UserSchema = new mongoose.Schema({
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
  // We'll keep these fields for database persistence
  // but they'll be populated from the Player object during saving
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
UserSchema.pre('save', async function(next) {
  const user = this;
  if (!user.isModified('password')) return next();
  try {
    if (user.password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(user.password, salt);
      user.password = hash;
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Add password verification method
UserSchema.methods.verifyPassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Interface for User document
export interface IUser extends mongoose.Document {
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

// Create and export model
export const UserModel = mongoose.model<IUser>('User', UserSchema);

export default UserModel;
