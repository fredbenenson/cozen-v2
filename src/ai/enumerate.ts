import { CozenState, Card } from '../types/game';
import { Ctx } from 'boardgame.io';

interface Move {
  move: string;
  args: any[];
}

/**
 * Generate all possible moves for AI
 */
export function enumerate(G: CozenState, ctx: Ctx, playerID?: string): Move[] {
  // Global try-catch to ensure we never crash the simulation
  try {
    // Nested try to handle specific errors in a controlled way
    try {
    // Static variable for logging - only log once
    if (!(enumerate as any).hasLogged) {
      console.log("MCTS enumerate initialized");
      (enumerate as any).hasLogged = true;
    }
    
    // Suppress logs by default
    const debug = false;
    
    // Defensive checks for all required parameters
    if (!G || !G.players) {
      return []; // Empty moves
    }
    
    if (!ctx) {
      return []; // Empty moves
    }
    
    // Handle missing playerID
    if (playerID === undefined) {
      // Try to get from ctx
      if (ctx && typeof ctx.currentPlayer !== 'undefined') {
        playerID = ctx.currentPlayer;
      } else {
        // Default to black player (AI is player 1)
        playerID = '1';
      }
    }
    
    // Make sure we have a valid playerID
    if (!playerID) {
      return [];
    }
    
    // Only enumerate moves in play phase
    if (ctx.phase !== 'play') {
      return [];
    }
    // Convert playerID to color
    const playerColor = playerID === '0' ? 'red' : 'black';
    
    // CRITICAL CHECK: Must have player in state
    if (!G.players[playerColor]) {
      if (debug) console.error(`enumerate: Player ${playerColor} is missing in G.players!`);
      return [];
    }
    
    const player = G.players[playerColor];
    const moves: Move[] = [];
    
    // CRITICAL CHECK: Round state must be running or last_play
    if (G.roundState !== 'running' && G.roundState !== 'last_play') {
      if (debug) console.log(`enumerate: Round state is ${G.roundState}, not running/last_play`);
      return [];
    }
    
    // CRITICAL CHECK: Must be player's turn
    // For MCTS simulations, we need to strictly enforce turn order
    if (G.activePlayer !== playerColor) {
      if (debug) console.log(`enumerate: Not ${playerColor}'s turn (activePlayer: ${G.activePlayer})`);
      return [];
    }
    
    // ADDITIONAL CHECK: Verify that boardgame.io's current player matches our active player
    if (ctx.currentPlayer !== (playerColor === 'red' ? '0' : '1')) {
      if (debug) console.log(`enumerate: ctx.currentPlayer (${ctx.currentPlayer}) doesn't match ${playerColor}`);
      return [];
    }
    
    // CRITICAL CHECK: Player must have cards
    if (!player.hand || player.hand.length === 0) {
      if (debug) console.log(`enumerate: Player ${playerColor} has no cards in hand`);
      return [];
    }

    // STAKE MOVES - Strictly validate stake conditions
    if (player.availableStakes && player.availableStakes.length > 0) {
      // Filter for cards that match the player's color
      const colorMatchedCards = player.hand.filter((card: Card) => {
        return card && card.color === playerColor;
      });
      
      // For stake moves, we should pick the best column based on game rules
      if (colorMatchedCards.length > 0) {
        // Get the correct stake column based on color - always use the highest/lowest
        // Red stakes from center outward (columns 5-9)
        // Black stakes from center outward (columns 4-0)
        let column: number;
        
        if (playerColor === 'red') {
          // Red stakes left-to-right starting from column 5
          // Use the lowest column number available (closest to center)
          column = Math.min(...player.availableStakes);
        } else {
          // Black stakes right-to-left starting from column 4
          // Use the highest column number available (closest to center)
          column = Math.max(...player.availableStakes);
        }
        
        // Double check the column has no stake already
        if (G.board[column] && !G.board[column].stakedCard) {
          // Only generate ONE stake move with the best card
          // Sort by value (highest VP first)
          const bestCards = [...colorMatchedCards].sort((a, b) => 
            (b.victoryPoints || 0) - (a.victoryPoints || 0)
          );
          
          // Skip high-value Kings (70+ VP) as stakes
          const stakableCards = bestCards.filter(card => 
            !(card.number === 13 && card.victoryPoints >= 70)
          );
          
          // If no stakable cards, fallback to any card
          const cardToStake = stakableCards.length > 0 ? stakableCards[0] : bestCards[0];
          
          if (cardToStake && cardToStake.id) {
            moves.push({
              move: 'stakeCard',
              args: [cardToStake.id]
            });
          }
        }
      }
    }

    // WAGER MOVES - Only generate for valid positions
    // Only generate if there are stakedCards
    const stakedColumns = G.board
      .map((col, index) => col.stakedCard ? index : -1)
      .filter(index => index !== -1);
    
    if (stakedColumns.length > 0) {
      // Filter to player's colored cards
      const playerCards = player.hand.filter((card: Card) => 
        card && card.color === playerColor
      );
      
      if (playerCards.length > 0) {
        // Generate a smaller set of card combinations to reduce the search space
        const cardCombinations = generateCardCombinations(playerCards)
          // Limit to 15 combinations to avoid explosion
          .slice(0, 15);
        
        // For each staked column, check if player can wager there
        for (const columnIndex of stakedColumns) {
          const column = G.board[columnIndex];
          
          // Must have column with positions
          if (column && column.positions) {
            // Check how many empty positions this player has in this column
            const emptyPositions = column.positions.filter(pos => 
              pos && pos.owner === playerColor && !pos.card
            );
            
            const availableCount = emptyPositions.length;
            
            // Only process if player has positions
            if (availableCount > 0) {
              // Find combinations that fit in available positions
              const validCombinations = cardCombinations.filter(cards => 
                cards.length <= availableCount
              );
              
              // Generate wager moves - limit to a reasonable number
              validCombinations.slice(0, 5).forEach(cards => {
                moves.push({
                  move: 'wagerCards',
                  args: [cards.map(c => c.id), columnIndex]
                });
              });
            }
          }
        }
      }
    }

    // Always use debug flag instead of SUPPRESS_AI_LOGS
    if (debug) {
      console.log(`enumerate: Generated ${moves.length} moves for player ${playerColor}`);
    }
    return moves;
    } catch (innerError) {
      // Handle specific errors inside the enumeration process
      console.error("Error in enumerate inner function:", innerError);
      return [];
    }
  } catch (outerError) {
    // Last resort error handler
    console.error("Critical error in enumerate:", outerError);
    return [];
  }
}

/**
 * Generate a smaller, curated set of card combinations that make strategic sense
 * This is optimized to keep the MCTS search space manageable
 */
function generateCardCombinations(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  
  // If hand is empty, return empty result
  if (!hand || hand.length === 0) {
    return [];
  }

  // Single cards - always include as they're always valid
  // Sort by value first so we prioritize high value cards
  const sortedByValue = [...hand].sort((a, b) => 
    (b.victoryPoints || b.number) - (a.victoryPoints || a.number)
  );
  
  // Only take top 3 highest value single cards to reduce search space
  sortedByValue.slice(0, 3).forEach(card => {
    result.push([card]);
  });

  // Find the best pair if any exist
  const numberGroups = new Map<number, Card[]>();
  for (const card of hand) {
    if (!numberGroups.has(card.number)) {
      numberGroups.set(card.number, []);
    }
    numberGroups.get(card.number)!.push(card);
  }
  
  // Add the best pair (if any)
  let bestPairValue = -1;
  let bestPair: Card[] | null = null;
  
  for (const [cardNumber, cards] of numberGroups.entries()) {
    if (cards.length >= 2) {
      // Calculate pair value (sum of VPs or numbers)
      const pairValue = cards.slice(0, 2).reduce((sum, card) => 
        sum + (card.victoryPoints || card.number), 0
      );
      
      if (pairValue > bestPairValue) {
        bestPairValue = pairValue;
        bestPair = cards.slice(0, 2);
      }
    }
  }
  
  if (bestPair) {
    result.push(bestPair);
  }

  // Find the best straight if any exist
  const sortedByNumber = [...hand].sort((a, b) => a.number - b.number);
  
  // Look for one good straight
  let bestStraight: Card[] | null = null;
  let bestStraightLength = 0;
  
  // Only check for 2-3 card straights (most common)
  for (let i = 0; i < sortedByNumber.length - 1; i++) {
    // Look for runs starting at this position
    let runLength = 1;
    let run = [sortedByNumber[i]];
    
    for (let j = i + 1; j < sortedByNumber.length && runLength < 3; j++) {
      if (sortedByNumber[j].number === sortedByNumber[j-1].number + 1) {
        run.push(sortedByNumber[j]);
        runLength++;
      } else {
        break;
      }
    }
    
    // Found a straight of at least 2 cards
    if (runLength >= 2 && runLength > bestStraightLength) {
      bestStraightLength = runLength;
      bestStraight = run;
    }
  }
  
  if (bestStraight) {
    result.push(bestStraight);
  }

  return result;
}
