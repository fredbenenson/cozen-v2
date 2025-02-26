// src/websocket/gameSocket.ts
import { Server, Socket } from 'socket.io';
import http from 'http';
import { Move } from '../types/game';
import { GameModel } from '../models/Game';
import { GameService } from '../services/gameService';
import { AIService } from '../services/ai/aiService';
import { AIDifficulty } from '../ai/cozenAI';

// Extend the Move interface to include gameId
interface GameMove extends Move {
  gameId: string;
}

interface AIRequest {
  gameId: string;
  difficulty?: string;
  searchDepth?: number;
}

export const initializeWebSocket = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinGame', (gameId: string) => {
      console.log(`Client ${socket.id} joined game ${gameId}`);
      socket.join(gameId);

      // Notify the room that a player has joined
      socket.to(gameId).emit('playerJoined', { socketId: socket.id });
    });

    socket.on('makeMove', async (move: GameMove) => {
      try {
        console.log('Move received:', move);

        // Find the game
        const game = await GameModel.findById(move.gameId);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Apply the move
        const updatedGameState = GameService.makeMove(game, move);
        game.set(updatedGameState);
        await game.save();

        // Broadcast the updated game to all players in the room
        io.to(move.gameId).emit('gameUpdated', game.toObject());
      } catch (error) {
        console.error('Error applying move:', error);
        socket.emit('error', { message: 'Error applying move' });
      }
    });

    socket.on('requestAIMove', async (request: AIRequest) => {
      try {
        console.log('AI move requested:', request);

        // Find the game
        const game = await GameModel.findById(request.gameId);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Calculate AI move
        const difficultyLevel = request.difficulty
          ? AIDifficulty[request.difficulty.toUpperCase() as keyof typeof AIDifficulty]
          : AIDifficulty.MEDIUM;

        const move = AIService.calculateMove(
          game,
          difficultyLevel,
          request.searchDepth || 4
        );

        if (!move) {
          socket.emit('error', { message: 'Could not calculate AI move' });
          return;
        }

        // Apply the move
        // We need to cast the move to GameMove to satisfy TypeScript
        const moveWithGameId = { ...move, gameId: request.gameId } as GameMove;
        const updatedGameState = GameService.makeMove(game, moveWithGameId);

        game.set(updatedGameState);
        await game.save();

        // Broadcast the AI move and updated game
        io.to(request.gameId).emit('aiMoveApplied', { move, game: game.toObject() });
      } catch (error) {
        console.error('Error calculating AI move:', error);
        socket.emit('error', { message: 'Error calculating AI move' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};
