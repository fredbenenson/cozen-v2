import { CozenState } from '../types/game';

// This file is kept for reference but the turn order logic 
// has been moved directly into the CozenGame definition

export const CozenTurnOrder = {
  first: ({ G }: { G: CozenState }) => {
    // For the first round, Black goes first
    if (G.isFirstRound) {
      return G.activePlayer === 'black' ? 0 : 1;
    }
    
    // Otherwise use activePlayer from state
    return G.activePlayer === 'red' ? 0 : 1;
  },
  
  next: ({ G }: { G: CozenState }) => {
    // Simply return the opposite player
    return G.activePlayer === 'red' ? 1 : 0;
  },
};