// src/services/stakeService.ts
import { Round } from '../types/round';
import { Player } from '../types/player';
import { Color } from '../types/game';

/**
 * Service for managing valid stake operations
 */
export class StakeService {
  /**
   * Get valid stake columns for a player based on current game state
   * Stakes must spread outward from center (columns 4-5)
   * 
   * Black (columns 0-4) spreads right to left from column 4
   * Red (columns 5-9) spreads left to right from column 5
   */
  static getValidStakeColumns(player: Player, round: Round): number[] {
    // Get all columns that already have stakes
    const stakedColumns = round.columns
      .map((col, index) => col.stakedCard ? index : -1)
      .filter(index => index !== -1);
    
    // Determine valid stake columns based on player color
    const playerColor = player.color;
    const validColumns: number[] = [];
    
    if (playerColor === Color.Black) {
      // Black stakes in columns 0-4
      // Start from column 4 and spread left
      if (!stakedColumns.includes(4)) {
        // If center-right is empty, it's the first valid column
        validColumns.push(4);
      } else {
        // Otherwise, find the rightmost staked column in Black's territory
        const blackStakedColumns = stakedColumns.filter(col => col <= 4);
        if (blackStakedColumns.length > 0) {
          const rightmostStake = Math.max(...blackStakedColumns);
          // Next valid stake is one column to the left
          const nextValidColumn = rightmostStake - 1;
          if (nextValidColumn >= 0 && !stakedColumns.includes(nextValidColumn)) {
            validColumns.push(nextValidColumn);
          }
        }
      }
    } else {
      // Red stakes in columns 5-9
      // Start from column 5 and spread right
      if (!stakedColumns.includes(5)) {
        // If center-left is empty, it's the first valid column
        validColumns.push(5);
      } else {
        // Otherwise, find the leftmost staked column in Red's territory
        const redStakedColumns = stakedColumns.filter(col => col >= 5);
        if (redStakedColumns.length > 0) {
          const leftmostStake = Math.min(...redStakedColumns);
          // Next valid stake is one column to the right
          const nextValidColumn = leftmostStake + 1;
          if (nextValidColumn <= 9 && !stakedColumns.includes(nextValidColumn)) {
            validColumns.push(nextValidColumn);
          }
        }
      }
    }
    
    // Check if valid columns are in player's available stakes
    return validColumns.filter(col => player.availableStakes.includes(col));
  }
  
  /**
   * Check if a specific column is valid for staking for the given player
   */
  static isValidStakeColumn(column: number, player: Player, round: Round): boolean {
    return this.getValidStakeColumns(player, round).includes(column);
  }
  
  /**
   * Get the next valid stake column for a player (closest to center)
   */
  static getNextValidStakeColumn(player: Player, round: Round): number | undefined {
    const validColumns = this.getValidStakeColumns(player, round);
    
    if (validColumns.length === 0) {
      return undefined;
    }
    
    // Sort columns by proximity to center
    return player.color === Color.Black
      ? Math.max(...validColumns) // Black takes highest (rightmost) valid column
      : Math.min(...validColumns); // Red takes lowest (leftmost) valid column
  }
}