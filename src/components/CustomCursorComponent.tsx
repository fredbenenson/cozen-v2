import React from 'react';
import { Card, Color } from '../types/game';
import { getCardRankSymbol } from '../utils/cardUtils';

interface CustomCursorComponentProps {
  isCursorVisible: boolean;
  selectedCards: Card[];
  cursorPosition: { x: number; y: number };
}

export const CustomCursorComponent = ({ 
  isCursorVisible, 
  selectedCards, 
  cursorPosition 
}: CustomCursorComponentProps) => {
  if (!isCursorVisible || selectedCards.length === 0) return null;
  
  const showStack = selectedCards.length > 1;
  const maxVisibleCards = Math.min(selectedCards.length, 3);
  const firstCard = selectedCards[0];
  const cardValue = getCardRankSymbol(firstCard.number);
  const isRed = firstCard.color === Color.Red;

  return (
    <div 
      className="custom-cursor"
      style={{
        display: isCursorVisible ? 'block' : 'none',
        left: `${cursorPosition.x}px`,
        top: `${cursorPosition.y}px`,
      }}
    >
      <div className={`cursor-card-stack ${showStack ? 'has-stack' : ''}`}>
        {showStack && Array.from({ length: Math.min(2, maxVisibleCards - 1) }).map((_, i) => (
          <div 
            key={`stack-${i}`}
            className={`cursor-card-element ${isRed ? 'cursor-card-red' : 'cursor-card-black'}`}
          />
        ))}
        
        <div className={`cursor-card-element ${isRed ? 'cursor-card-red' : 'cursor-card-black'}`}>
          {cardValue}
        </div>
        
        {selectedCards.length > 3 && (
          <div className="cursor-card-count">{selectedCards.length}</div>
        )}
      </div>
    </div>
  );
};