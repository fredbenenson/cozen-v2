// src/services/gameService.ts

import { Types } from 'mongoose';
import { BaseGameState, Player, Card, Move, Color } from '../types/game';
import { IPlayer } from '../models/Game';

export class GameService {
  public static initializeGame(player1: IPlayer, player2: IPlayer): BaseGameState {
    const player1Id = Types.ObjectId.isValid(player1._id)
      ? new Types.ObjectId(player1._id)
      : player1._id;

    const player2Id = Types.ObjectId.isValid(player2._id)
      ? new Types.ObjectId(player2._id)
      : player2._id;

    // Always start with player1 (index 0) to match test expectations
    return {
      players: [player1Id, player2Id],
      currentPlayerIndex: 0,
      board: this.createInitialBoard(),
      round: {
        activePlayer: this.convertToPlayer(player1),
        inactivePlayer: this.convertToPlayer(player2),
        turn: 1,
        state: 'running'
      },
      status: 'waiting'
    };
  }

  private static convertToPlayer(dbPlayer: IPlayer): Player {
    return {
      id: dbPlayer._id.toString(),
      username: dbPlayer.username,
      color: dbPlayer.color || Color.Red, // Default to red if unset
      hand: [],
      jail: [],
      elo: dbPlayer.elo
    };
  }

  public static makeMove(game: BaseGameState, move: Move): BaseGameState {
    const updatedGame = { ...game };

    // Simple placeholder: rotate currentPlayerIndex
    updatedGame.currentPlayerIndex = (updatedGame.currentPlayerIndex + 1) % 2;

    // TODO: Implement actual move logic (validate, update board, etc.)

    return updatedGame;
  }

  private static createInitialBoard() {
    // Example: create a 10-column board; each column has positions[] + stakedCard
    return Array(10).fill(null).map(() => ({
      positions: [],
      stakedCard: undefined
    }));
  }
}
