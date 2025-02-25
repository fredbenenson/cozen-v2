import { Color, Suit } from '../../types/game';
import { Player } from '../../types/player';
import { Round, Position } from '../../types/round';
import { AIMove } from '../../ai/aiTypes';

/**
 * Utility to visualize AI thinking and board state for tests
 */
export class AITestVisualization {
  /**
   * Create a string representation of the game board
   */
  static printBoard(round: Partial<Round>): string {
    const width = 80;
    const separator = '='.repeat(width);
    let output = '\n' + separator + '\n';
    output += 'BOARD STATE'.padStart(width/2 + 5).padEnd(width) + '\n';
    output += separator + '\n\n';

    // Print black player's information
    const blackPlayer = round.activePlayer?.color === Color.Black ?
      round.activePlayer : round.inactivePlayer;

    if (blackPlayer) {
      output += 'BLACK PLAYER:\n';
      output += `Hand: ${blackPlayer.hand.map(c => this.formatCard(c)).join(' ')}\n`;
      output += `Jail: ${blackPlayer.jail.length ? blackPlayer.jail.map(c => this.formatCard(c)).join(' ') : 'empty'}\n\n`;
    }

    // Print board
    output += 'BOARD:\n';

    if (round.columns && round.columns.length > 0) {
      // Print column headers
      output += '     ' + Array.from({length: round.columns.length}, (_, i) => i.toString().padStart(8)).join('') + '\n';
      output += '     ' + '↓'.padStart(8).repeat(round.columns.length) + '\n\n';

      // Get positions by row
      const rows: { [row: number]: Array<Position|undefined> } = {};
      round.columns.forEach((column, colIndex) => {
        if (column.positions) {
          column.positions.forEach(pos => {
            const rowIndex = pos.coord[0];
            if (!rows[rowIndex]) {
              rows[rowIndex] = Array(round.columns?.length || 0).fill(undefined);
            }
            rows[rowIndex][colIndex] = pos;
          });
        }
      });

      // Print black player's area (top)
      Object.keys(rows)
        .map(Number)
        .filter(row => row < 5)
        .sort((a, b) => a - b)
        .forEach(row => {
          let rowStr = row.toString().padStart(2) + ' B: ';
          for (let col = 0; col < (round.columns?.length || 0); col++) {
            const pos = rows[row]?.[col];
            rowStr += (pos?.card ? this.formatCard(pos.card) : '·').padStart(8);
          }
          output += rowStr + '\n';
        });

      // Print stakes row
      let stakeRow = ' S:   ';
      round.columns.forEach(column => {
        stakeRow += (column.stakedCard ? this.formatCard(column.stakedCard) : '·').padStart(8);
      });
      output += '\n' + stakeRow + '\n\n';

      // Print red player's area (bottom)
      Object.keys(rows)
        .map(Number)
        .filter(row => row > 5)
        .sort((a, b) => a - b)
        .forEach(row => {
          let rowStr = (row-6).toString().padStart(2) + ' R: ';
          for (let col = 0; col < (round.columns?.length || 0); col++) {
            const pos = rows[row]?.[col];
            rowStr += (pos?.card ? this.formatCard(pos.card) : '·').padStart(8);
          }
          output += rowStr + '\n';
        });
    } else {
      output += '  <Empty board>\n';
    }

    // Print red player's information
    const redPlayer = round.activePlayer?.color === Color.Red ?
      round.activePlayer : round.inactivePlayer;

    if (redPlayer) {
      output += '\nRED PLAYER:\n';
      output += `Hand: ${redPlayer.hand.map(c => this.formatCard(c)).join(' ')}\n`;
      output += `Jail: ${redPlayer.jail.length ? redPlayer.jail.map(c => this.formatCard(c)).join(' ') : 'empty'}\n\n`;
    }

    // Print current state
    output += 'GAME STATE:\n';
    output += `Active player: ${round.activePlayer?.color.toUpperCase()}\n`;
    output += `Round state: ${round.state}\n`;
    output += `Turn: ${round.turn}\n`;
    output += separator + '\n';

    return output;
  }

  /**
   * Format a move for display
   */
  static formatMove(move: AIMove, index: number): string {
    const moveType = move.isStake || move.didStake ? 'Stake' : 'Wager';
    const cards = move.cards.join(',');
    const strength = move.strength !== undefined ? move.strength : 'N/A';
    const score = move.score !== undefined ? move.score.toFixed(2) : 'N/A';

    return `${index + 1}. ${moveType} | Column: ${move.column} | Cards: ${cards} | Strength: ${strength} | Score: ${score}`;
  }

  /**
   * Print top moves with scores
   */
  static printTopMoves(moves: AIMove[], limit: number = 10): string {
    if (!moves || moves.length === 0) {
      return 'No moves available\n';
    }

    const sortedMoves = [...moves]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);

    let output = `\nTOP ${Math.min(limit, sortedMoves.length)} MOVES:\n`;
    output += `${'='.repeat(80)}\n`;

    sortedMoves.forEach((move, index) => {
      output += this.formatMove(move, index) + '\n';
    });

    return output;
  }

  /**
   * Return a formatted search summary
   */
  static formatSearchSummary(nodeCount: number, elapsedTimeMs: number, chosenMove?: AIMove): string {
    let output = '\nSEARCH SUMMARY:\n';
    output += `${'='.repeat(80)}\n`;
    output += `Nodes examined: ${nodeCount}\n`;
    output += `Time taken: ${elapsedTimeMs.toFixed(2)}ms\n`;

    if (chosenMove) {
      output += `\nCHOSEN MOVE:\n${this.formatMove(chosenMove, 0)}\n`;
    }

    return output;
  }

  /**
   * Get a string representation of a card
   */
  private static formatCard(card: any): string {
    if (!card) return '·';

    const numberStr = this.formatCardNumber(card.number);
    let suitStr = '';

    if (card.suit === Suit.Hearts) suitStr = '♥';
    else if (card.suit === Suit.Diamonds) suitStr = '♦';
    else if (card.suit === Suit.Clubs) suitStr = '♣';
    else if (card.suit === Suit.Spades) suitStr = '♠';

    return `${numberStr}${suitStr}`;
  }

  /**
   * Format card number to string representation
   */
  private static formatCardNumber(num: number): string {
    switch (num) {
      case 11: return 'J';
      case 12: return 'Q';
      case 13: return 'K';
      case 14: return 'A';
      default: return num.toString();
    }
  }
}
