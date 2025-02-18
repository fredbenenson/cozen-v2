// src/routes/authRoutes.ts
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PlayerModel } from '../models/Game';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user already exists
    const existingUser = await PlayerModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new player
    const player = new PlayerModel({
      username,
      color: null,
      elo: 1200,
      hand: [],
      jail: []
    });

    await player.save();

    // Generate token
    const token = jwt.sign(
      { id: player._id },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.status(201).json({ token, player });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const player = await PlayerModel.findOne({ username });
    if (!player) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, player.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: player._id },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.json({ token, player });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.post('/create-player', async (req, res) => {
  try {
    // Add logging to see what's coming in
    console.log('Request body:', req.body);

    // Explicitly destructure username
    const { username } = req.body || {};

    // Validate username
    if (!username) {
      return res.status(400).json({
        message: 'Username is required'
      });
    }

    // Check if user already exists
    const existingUser = await PlayerModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const player = new PlayerModel({
      username,
      elo: 1200,
      hand: [],
      jail: []
    });

    await player.save();

    res.status(201).json({
      message: 'Player created',
      playerId: player._id,
      username: player.username
    });
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


export default router;
