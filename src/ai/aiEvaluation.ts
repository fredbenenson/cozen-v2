import { Color } from '../types/game';
import { hidePoison } from './aiUtils';

/**
 * Methods for evaluating game state during AI decision making
 */
export class AIEvaluation {
  /**
   * Apply a move to a round for simulation
   */
  public static applyMove(round: any, move: any): void {
    if (!round || !move) return;

    // Get player reference (active player in the round)
    const player = round.activePlayer;
    if (!player || !player.hand || !Array.isArray(player.hand)) return;

    if (move.isStake) {
      // Handle staking
      if (!move.cards || !move.cards.length) return;

      const card = player.hand.find((c: any) => c && c.id === move.cards[0]);
      if (card) {
        // Remove from hand
        player.hand = player.hand.filter((c: any) => c && c.id !== card.id);

        // Add to stake (simplified for simulation)
        if (!round.columns || !Array.isArray(round.columns)) return;

        const column = round.columns[move.column];
        if (column) {
          column.stakedCard = card;
        }

        // Draw up (if implemented in player)
        if (typeof player.drawUp === 'function') {
          player.drawUp();
        }
      }
    } else {
      // Handle wagering
      if (!move.cards || !Array.isArray(move.cards)) return;

      const cardsToPlay = move.cards
        .map((cardId: string) => player.hand.find((c: any) => c && c.id === cardId))
        .filter((card: any) => card !== undefined);

      if (!cardsToPlay.length) return;

      // Remove from hand
      player.hand = player.hand.filter((c: any) =>
        c && !cardsToPlay.some((playedCard: any) => playedCard && playedCard.id === c.id)
      );

      // Add to column (simplified for simulation)
      if (!round.columns || !Array.isArray(round.columns)) return;

      const column = round.columns[move.column];
      if (column && column.positions && Array.isArray(column.positions)) {
        // Find open positions for this player
        const openPositions = column.positions
          .filter((p: any) => p && p.owner === player && !p.card)
          .slice(0, cardsToPlay.length);

        // Place cards in positions
        openPositions.forEach((position: any, index: number) => {
          if (position && cardsToPlay[index]) {
            position.card = cardsToPlay[index];
          }
        });
      }
    }

    // Flip active/inactive player
    if (round.inactivePlayer) {
      const temp = round.activePlayer;
      round.activePlayer = round.inactivePlayer;
      round.inactivePlayer = temp;
    }

    // Update round state if needed
    if (player.hand.length === 0) {
      if (round.state === 'last_play') {
        round.state = 'complete';
      } else {
        round.state = 'last_play';
      }
    }
  }

  /**
   * Score the board for evaluation
   */
  public static scoreBoard(round: any): void {
    if (!round.victoryPointScores) {
      round.victoryPointScores = { red: 0, black: 0 };
    }

    // For simulation purposes only - we're not changing the actual game state
    // This is just to get a score estimate for minimax
  }

  /**
   * Evaluate the game state and return a score from the perspective of the AI player
   */
  public static evaluateState(round: any, playerColor: Color): number {
    // Hide opponent's poison king so AI doesn't cheat
    hidePoison(round, playerColor);

    // Score the board
    this.scoreBoard(round);

    // Calculate a score (VP difference)
    const vpDifference = (round.victoryPointScores?.black || 0) - (round.victoryPointScores?.red || 0);

    // Return score from player's perspective
    return playerColor === Color.Black ? vpDifference : -vpDifference;
  }
}
