import React from 'react';
import { Card } from '../types/game';
import { CardComponent } from './CardComponent';

interface CardArrayComponentProps {
  cards: Card[] | Card | undefined;
  showBack?: boolean;
  showOpponentCards?: boolean;
}

export const CardArrayComponent = ({ 
  cards, 
  showBack = false, 
  showOpponentCards = false 
}: CardArrayComponentProps) => {
  if (!cards) return null;
  
  if (Array.isArray(cards)) {
    if (cards.length === 0) return null;
    return <CardComponent card={cards[0]} showBack={showBack} showOpponentCards={showOpponentCards} />;
  } else {
    return <CardComponent card={cards} showBack={showBack} showOpponentCards={showOpponentCards} />;
  }
};