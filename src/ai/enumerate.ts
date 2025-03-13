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
    
  // Only log if AI logging is enabled
  if (!SUPPRESS_AI_LOGS) {
    console.log("AI enumerate called with:", {
      hasG: !!G,
      hasPlayers: G && !!G.players,
      playerID,
      ctx
    });
  }

  if (!G || !G.players) {
    if (!SUPPRESS_AI_LOGS) {
      console.error("enumerate: G or G.players is missing!");
    }
    return [];
  }

  if (!playerID) {
    if (!SUPPRESS_AI_LOGS) {
      console.error("enumerate: playerID is missing!");
    }
    return [];
  }

  try {
    const playerColor = playerID === '0' ? 'red' : 'black';

    if (!G.players[playerColor]) {
      if (!SUPPRESS_AI_LOGS) {
        console.error(`enumerate: Player ${playerColor} is missing in G.players!`);
      }
      return [];
    }

    const player = G.players[playerColor];
    const moves: Move[] = [];

    // Check if it's this player's turn
    // When using the boardgame.io debug panel, allow black player to generate moves
    // even if it's not technically black's turn
    if (G.activePlayer !== playerColor && !(playerColor === 'black' && playerID === '1')) {
      if (!SUPPRESS_AI_LOGS) {
        console.log(`enumerate: Not ${playerColor}'s turn (activePlayer: ${G.activePlayer})`);
      }
      return [];
    }

    // If in running state, allow staking or wagering
    if (G.roundState === 'running' || G.roundState === 'last_play') {
      // Option 1: Stake a card
      if (player.hand && player.hand.length > 0 && player.availableStakes && player.availableStakes.length > 0) {
        player.hand.forEach((card: Card) => {
          moves.push({
            move: 'stakeCard',
            args: [card.id]
          });
        });
      }

      // Option 2: Wager cards
      // Get all possible combinations of cards to wager
      if (player.hand && player.hand.length > 0) {
        const cardCombinations = generateCardCombinations(player.hand);

        // For each combination, try each column with a stake
        cardCombinations.forEach((cards: Card[]) => {
          if (G.board) {
            G.board.forEach((column, index: number) => {
              if (column && column.stakedCard) {
                moves.push({
                  move: 'wagerCards',
                  args: [cards.map((c: Card) => c.id), index]
                });
              }
            });
          }
        });
      }
    }

    if (!SUPPRESS_AI_LOGS) {
      console.log(`enumerate: Generated ${moves.length} moves for player ${playerColor}`);
    }
    return moves;
  } catch (error) {
    if (!SUPPRESS_AI_LOGS) {
      console.error("Error in enumerate function:", error);
    }
    return [];
  }
}

/**
 * Generate all combinations of cards that make sense to play together
 * (pairs, straights, and singles)
 */
function generateCardCombinations(hand: Card[]): Card[][] {
  const result: Card[][] = [];

  // Single cards
  hand.forEach(card => {
    result.push([card]);
  });

  // Pairs (cards with same number)
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      if (hand[i].number === hand[j].number) {
        result.push([hand[i], hand[j]]);
      }
    }
  }

  // Straights (cards in sequence)
  // Sort by number first
  const sortedHand = [...hand].sort((a, b) => a.number - b.number);

  // Look for straights of length 2-5
  for (let length = 2; length <= Math.min(5, sortedHand.length); length++) {
    for (let i = 0; i <= sortedHand.length - length; i++) {
      const potentialStraight = sortedHand.slice(i, i + length);

      // Check if these cards form a straight
      let isStraight = true;
      for (let j = 1; j < potentialStraight.length; j++) {
        if (potentialStraight[j].number !== potentialStraight[j-1].number + 1) {
          isStraight = false;
          break;
        }
      }

      if (isStraight) {
        result.push(potentialStraight);
      }
    }
  }

  return result;
}
