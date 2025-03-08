import React from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { SocketIO } from 'boardgame.io/multiplayer';
import { MCTSBot } from 'boardgame.io/ai';
import { CozenGame } from './CozenGame';
import { CozenBoard } from './components/Board';
import { EnhancedBoard } from './components/EnhancedBoard';
import { enumerate } from './ai/enumerate';

// Create a client with local multiplayer (for testing)
export const CozenLocalClient = Client({
  game: CozenGame,
  board: EnhancedBoard, // Using our enhanced board
  debug: { impl: false },
  multiplayer: Local(),
});

// Create a client with AI opponent
export const CozenAIClient = Client({
  game: CozenGame,
  board: EnhancedBoard, // Using our enhanced board
  debug: { impl: false },
  multiplayer: Local({
    bots: {
      '1': MCTSBot,
    },
  }),
});

// Create a client with online multiplayer
export const CozenOnlineClient = (serverURI: string) => Client({
  game: CozenGame,
  board: EnhancedBoard, // Using our enhanced board
  debug: false,
  multiplayer: SocketIO({ server: serverURI }),
});

// Component for local play
export const LocalGameComponent = () => (
  <div>
    <h1>Cozen - Local Game</h1>
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ margin: '0 20px' }}>
        <h2>Red Player</h2>
        <CozenLocalClient playerID="red" />
      </div>
      <div style={{ margin: '0 20px' }}>
        <h2>Black Player</h2>
        <CozenLocalClient playerID="black" />
      </div>
    </div>
  </div>
);

// Component for playing against AI
export const AIGameComponent = () => (
  <div>
    <h1>Cozen - Play Against AI</h1>
    <CozenAIClient playerID="red" />
  </div>
);

// Component for joining an online game
export const OnlineGameComponent = ({ matchID, playerID, serverURI }: { matchID: string; playerID: string; serverURI: string }) => {
  const CozenClient = CozenOnlineClient(serverURI);
  
  return (
    <div>
      <h1>Cozen - Online Game</h1>
      <CozenClient matchID={matchID} playerID={playerID} />
    </div>
  );
};