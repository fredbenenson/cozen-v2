// src/services/gameService.ts
import { Types } from 'mongoose';
import { BaseGameState, Player, Card, Move } from '../types/game';

export class GameService {
  static initializeGame(player1: Player, player2: Player): BaseGameState {
    return {
      players: [new Types.ObjectId(player1.id), new Types.ObjectId(player2.id)],
      currentPlayerIndex: Math.random() < 0.5 ? 0 : 1,
      board: this.createInitialBoard(),
      round: {
        activePlayer: player1,
        inactivePlayer: player2,
        turn: 1,
        state: 'running'
      },
      status: 'waiting'
    };
  }

  static makeMove(game: BaseGameState, move: Move): BaseGameState {
    // Temporary implementation
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 2;
    return game;
  }

  static evaluateHand(hand: Card[], stakedCard: Card): number {
    // Temporary implementation
    return 0;
  }

  static checkRoundEnd(game: BaseGameState): boolean {
    // Temporary implementation
    return false;
  }

  private static createInitialBoard() {
    return Array(10).fill(null).map(() => ({
      positions: [],
      stakedCard: undefined
    }));
  }
}
