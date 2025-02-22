import { Server, Socket } from 'socket.io';
import http from 'http';
import { Move } from '../types/game';

interface GameMove extends Move {
  gameId: string;
}

export const initializeWebSocket = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('New client connected');

    socket.on('joinGame', (gameId: string) => {
      socket.join(gameId);
    });

    socket.on('makeMove', (move: GameMove) => {
      // Process move and broadcast to game room
      io.to(move.gameId).emit('moveUpdate', move);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return io;
};
