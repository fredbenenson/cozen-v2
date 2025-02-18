// src/websocket/gameSocket.ts
import { Server } from 'socket.io';
import http from 'http';

export const initializeWebSocket = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('joinGame', (gameId) => {
      socket.join(gameId);
    });

    socket.on('makeMove', (move) => {
      // Process move and broadcast to game room
      io.to(move.gameId).emit('moveUpdate', move);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return io;
};