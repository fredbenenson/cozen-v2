import { INVALID_MOVE } from 'boardgame.io/core';
import { CozenState, Card } from '../types/game';
import { getValidStakeColumn } from '../utils/deckUtils';
import { placeWageredCards, checkLastPlay, checkRoundComplete } from '../utils/boardUtils';

export const moves = {
  // Stake a card in the stakes row
  stakeCard: (G: CozenState, ctx: any, cardId: string) => {
    const playerID = ctx.currentPlayer as 'red' | 'black';
    const player = G.players[playerID];
    
    // Find the card in player's hand
    const cardIndex = player.hand.findIndex(card => card.id === cardId);
    if (cardIndex === -1) return INVALID_MOVE;
    
    // Get valid stake column
    const column = getValidStakeColumn(playerID, G);
    if (column === undefined) return INVALID_MOVE;
    
    // Get the card and remove from hand
    const card = player.hand[cardIndex];
    player.hand.splice(cardIndex, 1);
    
    // Mark card as played and set owner
    card.played = true;
    card.owner = playerID;
    
    // Place stake in column
    G.board[column].stakedCard = card;
    
    // Update available stakes
    player.availableStakes = player.availableStakes.filter(c => c !== column);
    
    // Draw a new card if not in last_play state
    if (G.roundState !== 'last_play' && player.cards.length > 0) {
      const drawnCard = player.cards.shift()!;
      player.hand.push(drawnCard);
      console.log(`${playerID} drew card: ${drawnCard.number} (${player.hand.length} cards in hand, ${player.cards.length} in deck)`);
    } else if (G.roundState === 'last_play') {
      console.log(`${playerID} in last_play state, not drawing cards`);
    } else if (player.cards.length === 0) {
      console.log(`${playerID} has no cards left in deck to draw`);
    }
    
    // Check if this affects game state
    checkLastPlay(G);
    checkRoundComplete(G);
    
    // Switch active player
    const temp = G.activePlayer;
    G.activePlayer = G.inactivePlayer;
    G.inactivePlayer = temp;
    
    return G;
  },
  
  // Wager cards in a column
  wagerCards: (G: CozenState, ctx: any, cardIds: string[], column: number) => {
    const playerID = ctx.currentPlayer as 'red' | 'black';
    const player = G.players[playerID];
    
    // Check if column has a stake
    if (!G.board[column] || !G.board[column].stakedCard) return INVALID_MOVE;
    
    // Find cards in hand
    const cardsToPlay: Card[] = [];
    const newHand = [...player.hand];
    
    for (const cardId of cardIds) {
      const index = newHand.findIndex(card => card.id === cardId);
      if (index === -1) return INVALID_MOVE;
      
      const card = newHand[index];
      card.played = true;
      card.owner = playerID;
      cardsToPlay.push(card);
      newHand.splice(index, 1);
    }
    
    if (cardsToPlay.length === 0) return INVALID_MOVE;
    
    // Update player's hand
    player.hand = newHand;
    
    // Place cards in the column
    placeWageredCards(G, playerID, cardsToPlay, column);
    
    // Check if this affects game state
    checkLastPlay(G);
    checkRoundComplete(G);
    
    // Switch active player
    const temp = G.activePlayer;
    G.activePlayer = G.inactivePlayer;
    G.inactivePlayer = temp;
    
    // No card drawing after wagering, which matches the original implementation
    
    return G;
  },
};