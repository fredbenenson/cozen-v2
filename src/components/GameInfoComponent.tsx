import React from 'react';
import { CozenState } from '../types/game';

interface GameInfoComponentProps {
  ctx: any;
  G: {
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
  message: string;
}

export const GameInfoComponent = ({ 
  ctx, 
  G, 
  message 
}: GameInfoComponentProps) => {
  return (
    <div className="game-info">
      <div>
        {ctx && ctx.currentPlayer === '0' ? 'Your Turn' : 'AI\'s Turn'}
      </div>
      <div style={{ marginTop: '5px', fontSize: '12px' }}>
        Round State: <span style={{ fontWeight: 'bold' }}>{G?.roundState || 'unknown'}</span>
      </div>
      <div style={{ fontSize: '12px' }}>
        Game Phase: <span style={{ fontWeight: 'bold' }}>{ctx?.phase || 'unknown'}</span>
      </div>
      <div style={{ fontSize: '12px' }}>
        Cards Left - Red: <span style={{ color: '#cc0000', fontWeight: 'bold' }}>{G?.players?.red?.hand?.length || 0}</span>, 
        Black: <span style={{ color: '#000099', fontWeight: 'bold' }}>{G?.players?.black?.hand?.length || 0}</span>
      </div>
      {message && <div style={{ color: 'red', fontWeight: 'bold', marginTop: '10px' }}>{message}</div>}
      {G?.roundState === 'complete' && <div style={{ color: 'green', fontWeight: 'bold', marginTop: '10px' }}>Round Complete!</div>}
      {G?.roundState === 'last_play' && <div style={{ color: 'orange', fontWeight: 'bold', marginTop: '10px' }}>Final Plays!</div>}
    </div>
  );
};