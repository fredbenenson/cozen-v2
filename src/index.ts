// src/index.ts
import express from 'express';
import http from 'http';
import cors from 'cors';
import { connectDB } from './config/database';
import gameRoutes from './routes/gameRoutes';
import authRoutes from './routes/authRoutes';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { initializeWebSocket } from './websocket/gameSocket';
import { AIService } from './services/aiService';

const app = express();
const server = http.createServer(app);

// Load .env file
dotenv.config({
  path: path.resolve(__dirname, '../.env')
});

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging middleware for debugging requests (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log('Request method:', req.method);
    console.log('Request path:', req.path);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    next();
  });
}

// Routes
app.use('/auth', authRoutes);
app.use('/games', gameRoutes);

// Add AI move route
AIService.addAIMoveRoute(app);

// Initialize WebSocket server
const io = initializeWebSocket(server);

const start = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server initialized`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

export default {
  port: process.env.PORT || 3000,
  database: {
    uri: process.env.MONGODB_URI!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiration: process.env.JWT_EXPIRATION || '1h',
  },
  environment: process.env.NODE_ENV || 'development',
  io, // Export the Socket.io instance
};

start();
