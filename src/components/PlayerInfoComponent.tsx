import React from 'react';
import { Card } from '../types/game';
import { CardComponent } from './CardComponent';

interface PlayerInfoComponentProps {
  player: any;
  color: string;
  selectedCards: Card[];
  toggleCardSelection: (card: Card) => void;
}

export const PlayerInfoComponent = ({ 
  player, 
  color, 
  selectedCards, 
  toggleCardSelection 
}: PlayerInfoComponentProps) => {
  return (
    <div className="player-info" style={{ backgroundColor: color === 'red' ? '#ffe6e6' : '#e0e0e0' }}>
      <h3>{color === 'red' ? 'Red' : 'Black'} - {player?.victory_points || 0} VP</h3>
      <div className={color === 'red' ? 'hand' : 'opponent-hand'}>
        {player?.hand?.map((card: Card) => {
          if (!card) return null;
          return (
            <CardComponent 
              key={card.id} 
              card={card} 
              isSelected={selectedCards.some(c => c.id === card.id)}
              onClick={color === 'red' ? toggleCardSelection : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};