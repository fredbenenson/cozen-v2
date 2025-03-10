import { Card, Column, CozenState, PlayerID, Position } from '../types/game';
import { Color } from '../types/game';
import { CardEvaluation } from '../services/cardEvaluation';
import { shuffleDeck } from './deckUtils';

// Create the initial board with positions
export function createInitialBoard(): Column[] {
  const MAX_COLUMNS = 10;
  const MAX_ROWS = 11; // 5 for each player + 1 for stakes
  
  // Create empty columns
  const columns: Column[] = Array(MAX_COLUMNS).fill(null).map(() => ({
    positions: [],
    stakedCard: undefined,
  }));
  
  // Create positions for each column
  let positionCount = 0;
  
  for (let colIdx = 0; colIdx < MAX_COLUMNS; colIdx++) {
    for (let rowIdx = 0; rowIdx < MAX_ROWS; rowIdx++) {
      // Determine position owner (black above middle, red below)
      const owner = rowIdx < 5 ? 'black' : rowIdx > 5 ? 'red' : (colIdx < 5 ? 'black' : 'red');
      
      // Create the position
      const position: Position = {
        card: undefined,
        owner,
        n: positionCount++,
        coord: [rowIdx, colIdx],
      };
      
      // Add to the column
      columns[colIdx].positions.push(position);
    }
  }
  
  return columns;
}

// Check if any player has an empty hand, trigger last_play state
export function checkLastPlay(G: CozenState) {
  const inactivePlayer = G.players[G.inactivePlayer];
  
  if (inactivePlayer.hand.length === 0 && G.roundState !== 'last_play') {
    G.roundState = 'last_play';
  }
}

// Check if round is complete (both players have no cards in hand)
export function checkRoundComplete(G: CozenState) {
  const activePlayer = G.players[G.activePlayer];
  
  if (activePlayer.hand.length === 0 && G.roundState === 'last_play') {
    G.roundState = 'complete';
  }
}

// Place wagered cards in a column
export function placeWageredCards(
  G: CozenState,
  playerID: PlayerID,
  cards: Card[],
  columnIndex: number
) {
  const column = G.board[columnIndex];
  
  // Find empty positions owned by this player
  const availablePositions = column.positions.filter(
    pos => pos.owner === playerID && !pos.card
  );
  
  // Sort positions based on player (red plays bottom-up, black plays top-down)
  availablePositions.sort((a, b) => {
    if (playerID === 'red') {
      return b.coord[0] - a.coord[0]; // Red plays bottom-up
    } else {
      return a.coord[0] - b.coord[0]; // Black plays top-down
    }
  });
  
  // Place cards in positions
  for (let i = 0; i < Math.min(cards.length, availablePositions.length); i++) {
    availablePositions[i].card = cards[i];
  }
}

// Score the board at the end of a round
export function scoreBoard(G: CozenState) {
  // Reset victory points for this round
  G.victoryPointScores = { red: 0, black: 0 };
  
  // Process each column with a stake
  G.board.forEach(column => {
    if (!column.stakedCard) return;
    
    // Check if the column is contested
    if (isColumnContested(column)) {
      resolveContestedColumn(G, column);
    } else {
      returnUncontestedCards(G, column);
    }
  });
}

// Check if a column has cards from both players
function isColumnContested(column: Column): boolean {
  const positions = column.positions;
  
  // Check if there are cards from both Red and Black
  const hasRed = positions.some(pos => {
    if (!pos.card) return false;
    if (Array.isArray(pos.card)) {
      return pos.card.some(c => c.color === Color.Red);
    }
    return pos.card.color === Color.Red;
  });
  
  const hasBlack = positions.some(pos => {
    if (!pos.card) return false;
    if (Array.isArray(pos.card)) {
      return pos.card.some(c => c.color === Color.Black);
    }
    return pos.card.color === Color.Black;
  });
  
  return hasRed && hasBlack;
}

// Return uncontested cards to owners
function returnUncontestedCards(G: CozenState, column: Column) {
  // Return the stake card to its owner
  if (column.stakedCard) {
    const owner = column.stakedCard.color === Color.Red ? 'red' : 'black';
    G.players[owner].cards.push(column.stakedCard);
  }
  
  // Return all cards to their owners
  column.positions.forEach(pos => {
    if (pos.card) {
      if (Array.isArray(pos.card)) {
        // Handle array of cards
        pos.card.forEach(card => {
          const owner = card.color === Color.Red ? 'red' : 'black';
          G.players[owner].cards.push(card);
        });
      } else {
        // Handle single card
        const owner = pos.card.color === Color.Red ? 'red' : 'black';
        G.players[owner].cards.push(pos.card);
      }
      pos.card = undefined;
    }
  });
  
  // Clear the stake
  column.stakedCard = undefined;
}

// Resolve a contested column (cards from both players)
function resolveContestedColumn(G: CozenState, column: Column) {
  if (!column.stakedCard) return;
  
  // Get the stake card
  const stake = column.stakedCard;
  const stakeIsRed = stake.color === Color.Red;
  
  // Get red and black cards separately
  const redCards: Card[] = [];
  column.positions.forEach(pos => {
    if (!pos.card) return;
    
    if (Array.isArray(pos.card)) {
      // Add all red cards from the array
      redCards.push(...pos.card.filter(card => card.color === Color.Red));
    } else if (pos.card.color === Color.Red) {
      // Add single red card
      redCards.push(pos.card);
    }
  });
    
  const blackCards: Card[] = [];
  column.positions.forEach(pos => {
    if (!pos.card) return;
    
    if (Array.isArray(pos.card)) {
      // Add all black cards from the array
      blackCards.push(...pos.card.filter(card => card.color === Color.Black));
    } else if (pos.card.color === Color.Black) {
      // Add single black card
      blackCards.push(pos.card);
    }
  });
  
  // Get card numbers for evaluation
  const redNumbers = redCards.map(card => card.number);
  const blackNumbers = blackCards.map(card => card.number);
  
  // Evaluate hands using CardEvaluation service
  const result = CardEvaluation.getWinningHand(redNumbers, blackNumbers, stake.number, stakeIsRed);
  
  if (result) {
    // Winner is determined
    const winner = result.hand1Wins ? 'red' : 'black';
    const loser = result.hand1Wins ? 'black' : 'red';
    
    // Cards to jail (loser's cards)
    const cardsToJail = result.hand1Wins ? blackCards : redCards;
    
    // Add stake to jail if it goes to jail
    if (result.stakeGoesToJail) {
      cardsToJail.push(stake);
    } else {
      // Return stake to owner
      const stakeOwner = stakeIsRed ? 'red' : 'black';
      G.players[stakeOwner].cards.push(stake);
    }
    
    // Jail the cards and update victory points
    cardsToJail.forEach(card => {
      if (card.color !== (winner === 'red' ? Color.Red : Color.Black)) {
        G.players[winner].jail.push(card);
        G.players[winner].victory_points += card.victoryPoints;
        G.victoryPointScores[winner] += card.victoryPoints;
        G.cardsJailed++;
      }
    });
    
    // Return winner's cards to their deck
    const winnerCards = result.hand1Wins ? redCards : blackCards;
    winnerCards.forEach(card => {
      G.players[winner].cards.push(card);
    });
  } else {
    // Tie - return all cards to their owners
    redCards.forEach(card => G.players.red.cards.push(card));
    blackCards.forEach(card => G.players.black.cards.push(card));
    G.players[stakeIsRed ? 'red' : 'black'].cards.push(stake);
  }
  
  // Clear the column
  column.positions.forEach(pos => {
    pos.card = undefined;
  });
  column.stakedCard = undefined;
}

// Check for victory (70+ victory points)
export function checkVictory(G: CozenState) {
  if (G.players.red.victory_points >= 70) {
    return 'red';
  }
  if (G.players.black.victory_points >= 70) {
    return 'black';
  }
  return null;
}

// Set up for the next round
export function setupNextRound(G: CozenState) {
  // Switch active player for the next round
  const temp = G.activePlayer;
  G.activePlayer = G.inactivePlayer;
  G.inactivePlayer = temp;
  
  // Reset round state
  G.roundState = 'running';
  G.isFirstRound = false;
  G.turnCount = 1;
  
  // Check if no cards were jailed (keep stakes for next round)
  const keepStakes = G.cardsJailed === 0;
  let previousStakes = undefined;
  
  if (keepStakes) {
    previousStakes = { ...G.firstStakes };
  }
  
  // Reset cards jailed count
  G.cardsJailed = 0;
  
  // Clear all cards from the board positions first
  G.board.forEach(column => {
    column.positions.forEach(position => {
      position.card = undefined;
    });
  });
  
  // Return cards from hand to deck
  ['red', 'black'].forEach(playerID => {
    const player = G.players[playerID as 'red' | 'black'];
    
    // Return hand to deck
    if (player.hand.length > 0) {
      player.cards.push(...player.hand);
      player.hand = [];
    }
    
    // Shuffle deck
    player.cards = shuffleDeck(player.cards);
    
    // Reset available stakes (all columns initially available)
    const allStakes = playerID === 'red' 
      ? [5, 6, 7, 8, 9] 
      : [0, 1, 2, 3, 4];
    
    // Reset all stake cards - we'll place new ones below
    player.availableStakes = [...allStakes];
  });
  
  // Clear all stakes on the board
  G.board.forEach(column => {
    column.stakedCard = undefined;
  });
  
  // Deal hands first
  ['red', 'black'].forEach(playerID => {
    const player = G.players[playerID as 'red' | 'black'];
    
    // Draw new hand
    if (player.cards.length >= 5) {
      player.hand = player.cards.splice(0, 5);
    } else {
      // If not enough cards, use what's available
      player.hand = [...player.cards];
      player.cards = [];
    }
  });
  
  // Set up new stakes
  if (!keepStakes) {
    // Draw new stakes
    const redStake = G.players.red.cards.length > 0 ? G.players.red.cards.shift() : undefined;
    const blackStake = G.players.black.cards.length > 0 ? G.players.black.cards.shift() : undefined;
    
    G.firstStakes = {
      red: redStake ? [redStake] : [],
      black: blackStake ? [blackStake] : [],
    };
    
    // Place stakes on board
    if (redStake) {
      G.board[5].stakedCard = redStake;
      G.players.red.availableStakes = G.players.red.availableStakes.filter(c => c !== 5);
    }
    
    if (blackStake) {
      G.board[4].stakedCard = blackStake;
      G.players.black.availableStakes = G.players.black.availableStakes.filter(c => c !== 4);
    }
  } else if (previousStakes) {
    // Keep existing stakes and add two new ones
    // This is for the special rule when no cards were jailed
    
    // Keep track of existing stakes
    G.firstStakes = previousStakes;
    
    // Implementation for the special rule - add additional stakes in next columns
    // Let's assume we already have stakes at columns 4 and 5
    
    // Place initial stakes back on the board
    if (G.firstStakes.red.length > 0) {
      G.board[5].stakedCard = G.firstStakes.red[0];
      G.players.red.availableStakes = G.players.red.availableStakes.filter(c => c !== 5);
    }
    
    if (G.firstStakes.black.length > 0) {
      G.board[4].stakedCard = G.firstStakes.black[0];
      G.players.black.availableStakes = G.players.black.availableStakes.filter(c => c !== 4);
    }
    
    // Find next available columns for each player
    const nextRedColumn = G.players.red.availableStakes.find(c => c > 5);
    const nextBlackColumn = G.players.black.availableStakes.find(c => c < 4);
    
    if (nextRedColumn !== undefined) {
      const redStake = G.players.red.cards.length > 0 ? G.players.red.cards.shift() : undefined;
      if (redStake) {
        G.board[nextRedColumn].stakedCard = redStake;
        G.players.red.availableStakes = G.players.red.availableStakes.filter(c => c !== nextRedColumn);
        G.firstStakes.red.push(redStake);
      }
    }
    
    if (nextBlackColumn !== undefined) {
      const blackStake = G.players.black.cards.length > 0 ? G.players.black.cards.shift() : undefined;
      if (blackStake) {
        G.board[nextBlackColumn].stakedCard = blackStake;
        G.players.black.availableStakes = G.players.black.availableStakes.filter(c => c !== nextBlackColumn);
        G.firstStakes.black.push(blackStake);
      }
    }
  }
  
  // Double check that we have hands for both players
  ['red', 'black'].forEach(playerID => {
    const player = G.players[playerID as 'red' | 'black'];
    if (player.hand.length === 0 && player.cards.length > 0) {
      // If somehow we missed dealing a hand, fix it now
      player.hand = player.cards.splice(0, Math.min(5, player.cards.length));
    }
  });
  
  // Ensure message is cleared for next round (don't hold round-end notifications)
  G.message = "";
}