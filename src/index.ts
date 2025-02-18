import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import gameRoutes from './routes/gameRoutes';
import authRoutes from './routes/authRoutes';  // Add this import
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';

const app = express();

// Load .env file
dotenv.config({
  path: path.resolve(__dirname, '../.env')
});

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging middleware for debugging requests
app.use((req, res, next) => {
  console.log('Request method:', req.method);
  console.log('Request path:', req.path);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  next();
});

// Routes
app.use('/auth', authRoutes);  // Add this line
app.use('/games', gameRoutes);

// Remove the duplicate /auth/create-player route that was here before

const start = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
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
};

start();
