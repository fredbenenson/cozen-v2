import React from 'react';
import { Card, Color } from '../types/game';
import { getCardDisplayValue, getCardRankSymbol } from '../utils/cardUtils';

interface CardComponentProps {
  card: Card | null;
  showBack?: boolean;
  showOpponentCards?: boolean;
  isSelected?: boolean;
  onClick?: (card: Card) => void;
}

export const CardComponent = ({ 
  card, 
  showBack = false, 
  showOpponentCards = false, 
  isSelected = false, 
  onClick 
}: CardComponentProps) => {
  if (!card) return null;
  
  // Handle hidden cards (opponent's hand)
  if ('hidden' in card) {
    const rank = Math.floor(Math.random() * 13) + 1;
    const rankSymbol = getCardRankSymbol(rank);
    const suit = ["♠", "♥", "♦", "♣"][Math.floor(Math.random() * 4)];
    const displayValue = `${rankSymbol}${suit}`;
    
    return (
      <div className="card-container">
        <div className={`card-flip ${showOpponentCards ? 'flipped' : ''}`}>
          <div className="card-back" />
          <div className={`card-front card black-card`} data-value={displayValue}>
            <div className="card-center-value">{rankSymbol}</div>
          </div>
        </div>
      </div>
    );
  }
  
  const cardValue = getCardDisplayValue(card);
  const rankSymbol = getCardRankSymbol(card.number);
  
  // For opponent's cards (black cards on the board)
  if (showBack && card.color === Color.Black) {
    return (
      <div className="card-container">
        <div className={`card-flip ${showOpponentCards ? 'flipped' : ''}`}>
          <div className="card-back" />
          <div className={`card-front card black-card`} data-value={cardValue}>
            <div className="card-center-value">{rankSymbol}</div>
          </div>
        </div>
      </div>
    );
  }
  
  // For regular back cards (not flippable)
  if (showBack) {
    return <div key={card.id} className="card-back" />;
  }
  
  // For regular face-up cards
  return (
    <div
      key={card.id}
      className={`card ${card.color === Color.Red ? 'red-card' : 'black-card'} ${isSelected ? 'selected' : ''}`}
      data-value={cardValue}
      onClick={onClick ? () => onClick(card) : undefined}
    >
      <div className="card-center-value">{rankSymbol}</div>
    </div>
  );
};