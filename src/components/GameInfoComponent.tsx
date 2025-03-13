import React from 'react';
import { CozenState } from '../types/game';

interface GameInfoComponentProps {
  ctx?: any;
  G?: {
    roundState?: string;
    players?: {
      red?: {
        hand?: any[];
      };
      black?: {
        hand?: any[];
      };
    };
  };
  message?: string;
  round?: number;
  activePlayer?: string;
  cardsRemaining?: { red: number; black: number };
  victoryPoints?: { red: number; black: number };
  onTriggerAI?: () => void;
}

export const GameInfoComponent = ({ 
  ctx, 
  G, 
  message,
  round,
  activePlayer,
  cardsRemaining,
  victoryPoints,
  onTriggerAI
}: GameInfoComponentProps) => {
  // Determine whose turn it is
  const isAITurn = ctx ? ctx.currentPlayer === '1' : activePlayer === 'black';
  const currentTurnDisplay = isAITurn ? 'AI\'s Turn (Black)' : 'Your Turn (Red)';
  
  // Use modern or legacy props
  const roundState = G?.roundState || (activePlayer === 'black' ? 'running' : 'running');
  const phase = ctx?.phase || 'play';
  const redCards = cardsRemaining?.red || G?.players?.red?.hand?.length || 0;
  const blackCards = cardsRemaining?.black || G?.players?.black?.hand?.length || 0;
  const roundNum = round || 1;
  
  return (
    <div className="game-info">
      <div className={isAITurn ? 'turn-indicator ai-turn' : 'turn-indicator player-turn'}>
        {currentTurnDisplay}
      </div>
      
      <div style={{ marginTop: '5px', fontSize: '12px' }}>
        Round: <span style={{ fontWeight: 'bold' }}>{roundNum}</span>
      </div>
      
      <div style={{ fontSize: '12px' }}>
        State: <span style={{ fontWeight: 'bold' }}>{roundState}</span>
      </div>
      
      <div style={{ fontSize: '12px' }}>
        Cards Left - Red: <span style={{ color: '#cc0000', fontWeight: 'bold' }}>{redCards}</span>, 
        Black: <span style={{ color: '#000099', fontWeight: 'bold' }}>{blackCards}</span>
      </div>
      
      {victoryPoints && (
        <div style={{ fontSize: '12px' }}>
          Score - Red: <span style={{ color: '#cc0000', fontWeight: 'bold' }}>{victoryPoints.red}</span>, 
          Black: <span style={{ color: '#000099', fontWeight: 'bold' }}>{victoryPoints.black}</span>
        </div>
      )}
      
      {message && <div style={{ color: 'red', fontWeight: 'bold', marginTop: '10px' }}>{message}</div>}
      
      {roundState === 'complete' && (
        <div style={{ color: 'green', fontWeight: 'bold', marginTop: '10px' }}>Round Complete!</div>
      )}
      
      {roundState === 'last_play' && (
        <div style={{ color: 'orange', fontWeight: 'bold', marginTop: '10px' }}>Final Plays!</div>
      )}
      
      {/* AI trigger button removed as debugging with boardgame.io debug panel is preferred */}
    </div>
  );
};