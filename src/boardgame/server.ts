import { CozenGame } from './CozenGame';
import express from 'express';
import path from 'path';
// @ts-ignore
import { Server } from 'boardgame.io/server';

// Create a boardgame.io server
const boardgameServer = Server({ games: [CozenGame] });
const boardgameServerPort = parseInt(process.env.BOARDGAME_PORT || '8001');

// Create an Express app for our frontend
const app = express();
const PORT = parseInt(process.env.PORT || '8000');

// Setup routes for static HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, './index.html'));
});

app.get('/boardgame/local', (req, res) => {
  res.sendFile(path.resolve(__dirname, './local.html'));
});

app.get('/boardgame/ai', (req, res) => {
  res.sendFile(path.resolve(__dirname, './ai.html'));
});

app.get('/boardgame/board', (req, res) => {
  res.sendFile(path.resolve(__dirname, './board.html'));
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}/`);
});

// Start the boardgame.io server
boardgameServer.run(boardgameServerPort, () => {
  console.log(`Boardgame.io server running at http://localhost:${boardgameServerPort}/`);
});