import React from 'react';

interface RoundEndData {
  redVP: number;
  blackVP: number;
  redVPGained: number;
  blackVPGained: number;
  nextPlayer: string;
}

interface RoundEndOverlayComponentProps {
  showRoundEnd: boolean;
  roundEndData: RoundEndData | null;
}

export const RoundEndOverlayComponent = ({ 
  showRoundEnd, 
  roundEndData 
}: RoundEndOverlayComponentProps) => {
  if (!showRoundEnd || !roundEndData) return null;
  
  return (
    <div className="round-transition-overlay">
      <div className="round-transition">
        <h2>Round Complete!</h2>
        <p>Scoring the board and preparing the next round...</p>
        
        <div style={{ marginTop: '1rem', fontSize: '1.1rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ color: '#ff7777', fontWeight: 'bold' }}>
              Red: {roundEndData.redVP} VP
            </span>
            {roundEndData.redVPGained > 0 && 
              <span style={{ color: '#77ff77', marginLeft: '0.5rem' }}>
                (+{roundEndData.redVPGained} this round)
              </span>
            }
          </div>
          
          <div>
            <span style={{ color: '#7777ff', fontWeight: 'bold' }}>
              Black: {roundEndData.blackVP} VP
            </span>
            {roundEndData.blackVPGained > 0 && 
              <span style={{ color: '#77ff77', marginLeft: '0.5rem' }}>
                (+{roundEndData.blackVPGained} this round)
              </span>
            }
          </div>
        </div>
        
        <p style={{ marginTop: '1rem', color: '#aaa', fontStyle: 'italic' }}>
          {roundEndData.nextPlayer === 'red' ? 'Red' : 'Black'} will go first in the next round
        </p>
      </div>
    </div>
  );
};