import { INVALID_MOVE } from 'boardgame.io/core';
import { CozenState, Card } from '../types/game';
import { getValidStakeColumn } from '../utils/deckUtils';
import { placeWageredCards, checkLastPlay, checkRoundComplete } from '../utils/boardUtils';

// Import SUPPRESS_AI_LOGS from global context if available
let SUPPRESS_AI_LOGS = true;
try {
  if (typeof window !== 'undefined' && (window as any).SUPPRESS_AI_LOGS !== undefined) {
    SUPPRESS_AI_LOGS = (window as any).SUPPRESS_AI_LOGS;
  } else if (typeof global !== 'undefined' && (global as any).SUPPRESS_AI_LOGS !== undefined) {
    SUPPRESS_AI_LOGS = (global as any).SUPPRESS_AI_LOGS;
  }
} catch (e) {
  // Default to true if we can't access global/window
}

export const moves = {
  // Stake a card in the stakes row
  stakeCard: (G: CozenState, ctx: any, cardId: string) => {
    if (!SUPPRESS_AI_LOGS) {
      console.log(`stakeCard move called with player=${ctx.currentPlayer}, G.activePlayer=${G.activePlayer}, cardId=${cardId}`);
    }
    
    const playerID = ctx.currentPlayer as 'red' | 'black';
    const player = G.players[playerID];
    
    // Make sure it's this player's turn
    if (G.activePlayer !== playerID) {
      if (!SUPPRESS_AI_LOGS) {
        console.log(`Invalid move: Not ${playerID}'s turn (active player is ${G.activePlayer})`);
      }
      return INVALID_MOVE;
    }
    
    // Find the card in player's hand
    const cardIndex = player.hand.findIndex(card => card.id === cardId);
    if (cardIndex === -1) {
      if (!SUPPRESS_AI_LOGS) {
        console.log(`Invalid move: Card ${cardId} not found in player's hand`);
      }
      return INVALID_MOVE;
    }
    
    // Get valid stake column
    const column = getValidStakeColumn(playerID, G);
    if (column === undefined) {
      if (!SUPPRESS_AI_LOGS) {
        console.log(`Invalid move: No valid stake column for ${playerID}`);
      }
      return INVALID_MOVE;
    }
    
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
    
    // CRITICAL: Explicitly end the current player's turn
    // Without this, the AI turn might not advance properly
    try {
      if (ctx && ctx.events && typeof ctx.events.endTurn === 'function') {
        console.log(`${playerID} ending turn explicitly`);
        ctx.events.endTurn();
      } else {
        console.error("Cannot end turn: ctx.events.endTurn is not available");
      }
    } catch (error) {
      console.error("Error ending turn:", error);
    }
    
    return G;
  },
  
  // Wager cards in a column
  wagerCards: (G: CozenState, ctx: any, cardIds: string[], column: number) => {
    if (!SUPPRESS_AI_LOGS) {
      console.log(`wagerCards move called with player=${ctx.currentPlayer}, G.activePlayer=${G.activePlayer}, column=${column}`);
    }
    
    const playerID = ctx.currentPlayer as 'red' | 'black';
    const player = G.players[playerID];
    
    // Make sure it's this player's turn
    if (G.activePlayer !== playerID) {
      if (!SUPPRESS_AI_LOGS) {
        console.log(`Invalid move: Not ${playerID}'s turn (active player is ${G.activePlayer})`);
      }
      return INVALID_MOVE;
    }
    
    // Check if column has a stake
    if (!G.board[column] || !G.board[column].stakedCard) {
      if (!SUPPRESS_AI_LOGS) {
        console.log(`Invalid move: Column ${column} doesn't have a stake`);
      }
      return INVALID_MOVE;
    }
    
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
    
    if (cardsToPlay.length === 0) {
      if (!SUPPRESS_AI_LOGS) {
        console.log(`Invalid move: No valid cards to play`);
      }
      return INVALID_MOVE;
    }
    
    // Update player's hand
    player.hand = newHand;
    
    // Place cards in the column
    placeWageredCards(G, playerID, cardsToPlay, column);
    
    // Check if this affects game state
    checkLastPlay(G);
    checkRoundComplete(G);
    
    // CRITICAL: Explicitly end the current player's turn
    // Without this, the AI turn might not advance properly
    try {
      if (ctx && ctx.events && typeof ctx.events.endTurn === 'function') {
        console.log(`${playerID} ending turn explicitly`);
        ctx.events.endTurn();
      } else {
        console.error("Cannot end turn: ctx.events.endTurn is not available");
      }
    } catch (error) {
      console.error("Error ending turn:", error);
    }
    
    // No card drawing after wagering, which matches the original implementation
    
    return G;
  },
};