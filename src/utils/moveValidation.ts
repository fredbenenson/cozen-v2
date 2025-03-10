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
 * Checks if a position is in a player's territory for wagering
 */
export function isValidWagerPosition(rowIndex: number, columnIndex: number, playerColor: PlayerID): boolean {
  // First, check if the rows are in the player's territory
  const validRow = playerColor === 'red' 
    ? BOARD.RED_TERRITORY.ROWS.includes(rowIndex)
    : BOARD.BLACK_TERRITORY.ROWS.includes(rowIndex);
    
  // Second, validate the column belongs to this player's territory
  const validColumn = playerColor === 'red'
    ? BOARD.RED_TERRITORY.COLUMNS.includes(columnIndex)
    : BOARD.BLACK_TERRITORY.COLUMNS.includes(columnIndex);
    
  // Must satisfy both conditions
  return validRow && validColumn;
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