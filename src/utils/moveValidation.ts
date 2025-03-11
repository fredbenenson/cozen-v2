import { CozenState, PlayerID } from '../types/game';

// Constants for board structure
export const BOARD = {
  TOTAL_COLUMNS: 10,
  TOTAL_ROWS: 11,
  STAKE_ROW: 5,
  RED_TERRITORY: {
    COLUMNS: [5, 6, 7, 8, 9],
    ROWS: [6, 7, 8, 9, 10]
  },
  BLACK_TERRITORY: {
    COLUMNS: [0, 1, 2, 3, 4],
    ROWS: [0, 1, 2, 3, 4]
  }
};

/**
 * Checks if a column is in a player's territory for staking
 */
export function isValidStakeColumn(columnIndex: number, playerColor: PlayerID): boolean {
  if (playerColor === 'red') {
    return BOARD.RED_TERRITORY.COLUMNS.includes(columnIndex);
  } else {
    return BOARD.BLACK_TERRITORY.COLUMNS.includes(columnIndex);
  }
}

/**
 * Checks if a position belongs to a player for wagering
 * Players can wager in any column that has a stake, but only in positions that belong to them
 */
export function isValidWagerPosition(rowIndex: number, columnIndex: number, playerColor: PlayerID): boolean {
  // For wagering, we only need to check if the position belongs to the player
  // This is determined by the row - Red owns rows 6-10, Black owns rows 0-4
  if (playerColor === 'red') {
    return BOARD.RED_TERRITORY.ROWS.includes(rowIndex);
  } else {
    return BOARD.BLACK_TERRITORY.ROWS.includes(rowIndex);
  }
}

/**
 * Gets all valid wager positions for a player in a specific column
 */
export function getValidWagerPositions(G: CozenState, columnIndex: number, playerColor: PlayerID): number[] {
  const column = G.board[columnIndex];
  if (!column || !column.stakedCard) return [];
  
  return column.positions
    .filter(pos => 
      pos.owner === playerColor && 
      !pos.card && 
      pos.coord[0] !== BOARD.STAKE_ROW) // Exclude stake row
    .map(pos => pos.n); // Return position IDs
}

/**
 * Checks if a player has any valid wager positions in a column
 */
export function hasValidWagerPositions(G: CozenState, columnIndex: number, playerColor: PlayerID): boolean {
  return getValidWagerPositions(G, columnIndex, playerColor).length > 0;
}

/**
 * Check if a player has any valid moves remaining (staking or wagering)
 */
export function hasValidMovesRemaining(G: CozenState, playerColor: PlayerID): boolean {
  // If player has no cards, they have no valid moves
  if (G.players[playerColor].hand.length === 0) {
    return false;
  }
  
  // Check if player can stake
  if (G.players[playerColor].availableStakes.length > 0) {
    return true;
  }
  
  // Check if player can wager in any column
  for (let i = 0; i < BOARD.TOTAL_COLUMNS; i++) {
    // Column must have a stake card to be wagerable
    if (G.board[i]?.stakedCard && hasValidWagerPositions(G, i, playerColor)) {
      return true;
    }
  }
  
  // No valid moves found
  return false;
}

/**
 * Gets the next stake column for a player based on game rules
 * Red stakes from 5 to 9, Black stakes from 4 to 0
 */
export function getNextStakeColumn(G: CozenState, playerColor: PlayerID): number | undefined {
  const player = G.players[playerColor];
  if (player.availableStakes.length === 0) return undefined;
  
  if (playerColor === 'red') {
    // Red stakes left-to-right from column 5
    return Math.min(...player.availableStakes);
  } else {
    // Black stakes right-to-left from column 4
    return Math.max(...player.availableStakes);
  }
}

/**
 * Get positions sorted by proximity to stake for a specific column
 * This ensures cards are placed in visually appealing order
 */
export function getSortedPositionsForColumn(
  G: CozenState, 
  columnIndex: number, 
  playerColor: PlayerID
): number[] {
  const column = G.board[columnIndex];
  if (!column) return [];
  
  // Find empty positions owned by this player in this column
  const emptyPositions = column.positions
    .filter(pos => 
      pos.owner === playerColor && 
      !pos.card && 
      pos.coord[0] !== BOARD.STAKE_ROW); // Exclude stake row
  
  // Sort positions by proximity to stake row
  return emptyPositions
    .sort((a, b) => {
      const aRowDist = Math.abs(a.coord[0] - BOARD.STAKE_ROW);
      const bRowDist = Math.abs(b.coord[0] - BOARD.STAKE_ROW);
      return aRowDist - bRowDist; // Sort by proximity to stake row
    })
    .map(pos => pos.n); // Return position IDs
}