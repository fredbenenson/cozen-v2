const express = require('express');
const path = require('path');

const app = express();
const PORT = 8000;

// Serve static HTML files
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`- Open http://localhost:${PORT}/ in your browser`);
  console.log(`- View game board at http://localhost:${PORT}/boardgame/board`);
});