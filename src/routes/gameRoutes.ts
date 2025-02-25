// src/routes/gameRoutes.ts
import express from 'express';
import { GameService } from '../services/gameService';
import { GameModel } from '../models/Game';
import { UserModel } from '../models/User';

const router = express.Router();

router.post('/create', async (req, res) => {
  try {
    const { player1Id, player2Id } = req.body;
    const player1 = await UserModel.findById(player1Id);
    const player2 = await UserModel.findById(player2Id);

    if (!player1 || !player2) {
      return res.status(404).json({ error: 'Players not found' });
    }

    const gameState = GameService.initializeGame(player1, player2);
    const game = new GameModel(gameState);
    await game.save();

    res.status(201).json(game);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

router.post('/:gameId/move', async (req, res) => {
  try {
    const { gameId } = req.params;
    const move = req.body;

    const game = await GameModel.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const updatedGameState = GameService.makeMove(game, move);
    game.set(updatedGameState);
    await game.save();

    res.json(game);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
