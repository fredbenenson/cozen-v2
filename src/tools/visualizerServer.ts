/**
 * Cozen Game Visualizer Server
 * 
 * This server provides an API for the web-based game tree visualizer to interact
 * with the actual game logic and minimax AI implementation.
 * 
 * Run with: npm run visualizer
 * Then visit: http://localhost:3000
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { CozenAI, AIDifficulty } from '../ai/cozenAI';
import { createSampleGameState } from './visualizeMinimaxCLI';
import { StakeService } from '../services/stakeService';
import { cloneRound } from '../ai/aiUtils';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Serve static files from visualizations/web directory
app.use(express.static(path.join(__dirname, '../../visualizations/web')));

// Global game state (for demo purposes)
let currentGameState = createSampleGameState().game;
const aiPlayer = createSampleGameState().aiPlayer;
const ai = new CozenAI(aiPlayer, AIDifficulty.HARD, 3);

// Get current game state
app.get('/api/game', (req, res) => {
  res.json(currentGameState);
});

// Reset game to initial state
app.post('/api/game/reset', (req, res) => {
  const newState = createSampleGameState();
  currentGameState = newState.game;
  res.json(currentGameState);
});

// Get possible moves for current state
app.get('/api/moves', (req, res) => {
  // Use the AI's internal move generation
  ai.enableDebug(); // Enable detailed move info
  const result = ai.calculateMoveWithStats(currentGameState.round);
  
  // For the visualization, we want all candidate moves, not just the best one
  const moves = (ai as any).moveScores || [];
  
  res.json({
    moves,
    stats: {
      searchDepth: result.searchDepth,
      nodesExplored: result.nodesExplored,
      timeElapsed: result.timeElapsed,
      candidateMoves: result.candidateMoves
    }
  });
});

// Apply a move and get the new state
app.post('/api/move/apply', (req, res) => {
  const move = req.body.move;
  
  if (!move) {
    return res.status(400).json({ error: 'Move is required' });
  }
  
  try {
    // Use the game's move application logic
    currentGameState.round.move(move);
    
    // Return the updated game state
    res.json(currentGameState);
  } catch (error) {
    res.status(400).json({ 
      error: 'Failed to apply move', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Evaluate a specific move with minimax
app.post('/api/move/evaluate', (req, res) => {
  const move = req.body.move;
  const depth = req.body.depth || 3;
  
  if (!move) {
    return res.status(400).json({ error: 'Move is required' });
  }
  
  try {
    // Clone the current game state
    const roundCopy = cloneRound(currentGameState.round);
    
    // Apply the move
    (ai as any).applyMove(roundCopy, move);
    
    // Evaluate using minimax
    const startTime = Date.now();
    const score = (ai as any).minimax(
      roundCopy,
      depth - 1,
      false, // Opponent's turn next
      -Infinity,
      Infinity,
      aiPlayer.color
    );
    const endTime = Date.now();
    
    res.json({
      move,
      score,
      timeElapsed: endTime - startTime,
      depth,
      nodesExplored: (ai as any).totalNodeCount
    });
  } catch (error) {
    res.status(400).json({ 
      error: 'Failed to evaluate move', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Get valid stake columns for a player
app.get('/api/stakes/:playerColor', (req, res) => {
  const playerColor = req.params.playerColor;
  const player = playerColor.toLowerCase() === 'red' 
    ? currentGameState.redPlayer 
    : currentGameState.blackPlayer;
  
  const validColumns = StakeService.getValidStakeColumns(player, currentGameState.round);
  
  res.json({ 
    playerColor, 
    validColumns 
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Cozen Game Visualizer Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the visualizer`);
});