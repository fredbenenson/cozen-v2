import React from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { SocketIO } from 'boardgame.io/multiplayer';
import { MCTSBot } from 'boardgame.io/ai';
import { CozenGame } from './CozenGame';
import { Board } from '../components/Board';
import { enumerate } from '../ai/enumerate';

// Create a client with local multiplayer (for testing)
export const CozenLocalClient = Client({
  game: CozenGame,
  board: Board,
  debug: false,
  multiplayer: Local(),
});

// Create a client with AI opponent
export const CozenAIClient = Client({
  game: CozenGame,
  board: Board,
  debug: false,
  multiplayer: Local({
    bots: {
      '1': MCTSBot,
    },
  }),
});

// Create a client with online multiplayer
export const CozenOnlineClient = (serverURI: string) => Client({
  game: CozenGame,
  board: Board,
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
        <CozenLocalClient playerID="0" />
      </div>
      <div style={{ margin: '0 20px' }}>
        <h2>Black Player</h2>
        <CozenLocalClient playerID="1" />
      </div>
    </div>
  </div>
);

// Component for playing against AI
export const AIGameComponent = () => (
  <div>
    <h2 style={{ 
      textAlign: 'center', 
      color: '#444',
      margin: '0 0 20px 0',
      fontWeight: 'normal'
    }}>
      Playing against AI
    </h2>
    <CozenAIClient playerID="0" />
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