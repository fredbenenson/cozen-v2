import { GameService } from '../services/gameService';
import { Color } from '../types/game';
import { createMockPlayer } from './utils/mockMongoose';

describe('GameService', () => {
  it('should initialize a new game correctly', () => {
    const player1 = createMockPlayer();
    const player2 = createMockPlayer({ color: Color.Black });

    const game = GameService.initializeGame(player1, player2);

    expect(game.players).toHaveLength(2);
    expect(game.players[0].toString()).toBe(player1._id.toString());
    expect(game.players[1].toString()).toBe(player2._id.toString());
    expect(game.status).toBe('waiting');
  });

  it('should handle move execution', () => {
    const player1 = createMockPlayer();
    const player2 = createMockPlayer({ color: Color.Black });

    const game = GameService.initializeGame(player1, player2);

    const move = {
      playerId: player1._id.toString(),
      cards: [],
      column: 0,
      isStake: true
    };

    const updatedGame = GameService.makeMove(game, move);
    expect(updatedGame.currentPlayerIndex).toBe(1); // Should switch to other player
  });

  it('should create a valid board configuration', () => {
    const player1 = createMockPlayer();
    const player2 = createMockPlayer({ color: Color.Black });

    const game = GameService.initializeGame(player1, player2);

    expect(game.board).toBeDefined();
    expect(Array.isArray(game.board)).toBe(true);
    expect(game.board.length).toBeGreaterThan(0);
    game.board.forEach(column => {
      expect(column.positions).toBeDefined();
      expect(Array.isArray(column.positions)).toBe(true);
    });
  });
});
