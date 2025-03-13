import React from 'react';
import { getCardDisplayValue, getCardRankSymbol } from '../utils/cardUtils';

interface OpponentInfoComponentProps {
  opponent: any;
  showOpponentCards: boolean;
}

export const OpponentInfoComponent = ({ 
  opponent, 
  showOpponentCards
}: OpponentInfoComponentProps) => {
  // Detect if we're truly in developer mode by checking card structure
  // If cards have real properties instead of just 'hidden', we're in dev mode
  const isDevMode = opponent?.hand?.length > 0 && 
                   opponent.hand[0] && 
                   opponent.hand[0].number !== undefined;
  return (
    <div className="player-info" style={{ backgroundColor: '#e0e0e0' }}>
      <h3>
        Black - {opponent?.victory_points || 0} VP
      </h3>
      <div className="opponent-hand">
        {opponent?.hand?.map((card: any, i: number) => {
          let cardValue = "?";
          let rankSymbol = "?";
          
          // Check if we have real card data (dev mode is active)
          if (card.number !== undefined) {
            cardValue = getCardDisplayValue(card);
            rankSymbol = getCardRankSymbol(card.number);
          }
          
          return (
            <div className="card-container" key={`opponent-card-${i}`}>
              <div className={`card-flip ${showOpponentCards ? 'flipped' : ''}`}>
                <div className="card-back opponent-card"></div>
                <div className={`card-front card black-card`} data-value={cardValue}>
                  <div className="card-center-value">{rankSymbol}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};