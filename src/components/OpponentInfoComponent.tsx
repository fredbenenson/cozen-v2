import React from 'react';
import { getCardDisplayValue, getCardRankSymbol } from '../utils/cardUtils';

interface OpponentInfoComponentProps {
  opponent: any;
  showOpponentCards: boolean;
  toggleOpponentCards: () => void;
}

export const OpponentInfoComponent = ({ 
  opponent, 
  showOpponentCards, 
  toggleOpponentCards 
}: OpponentInfoComponentProps) => {
  return (
    <div className="player-info" style={{ backgroundColor: '#e0e0e0' }}>
      <div className="toggle-cards-container">
        <label className="form-switch">
          <input 
            type="checkbox" 
            checked={showOpponentCards}
            onChange={toggleOpponentCards}
          />
          <i></i>
          <span className="toggle-label">{showOpponentCards ? "Hide Opponent Cards" : "Show Opponent Cards"}</span>
        </label>
      </div>
      <h3>Black - {opponent?.victory_points || 0} VP</h3>
      <div className="opponent-hand">
        {opponent?.hand?.map((card: any, i: number) => {
          let cardValue = "?";
          let rankSymbol = "?";
          
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