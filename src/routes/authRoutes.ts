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
      password: hashedPassword,
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

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Find user
    const player = await PlayerModel.findOne({ username });
    if (!player) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Get stored password hash
    const storedHash = player.password;
    if (!storedHash) {
      return res.status(400).json({ message: 'Password not set for this account' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, storedHash);
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
    console.log('Request body:', req.body);
    const { username } = req.body || {};

    if (!username) {
      return res.status(400).json({
        message: 'Username is required'
      });
    }

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
