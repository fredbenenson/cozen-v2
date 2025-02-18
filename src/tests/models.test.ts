// src/tests/models.test.ts
import { PlayerModel, GameModel, IPlayer } from '../models/Game';
import { GameState } from '../types/game';
import '../tests/setup';  // This will handle all the database setup

describe('Player Model', () => {
  it('should create a new player successfully', async () => {
    const validPlayer = {
      username: 'testuser',
      password: 'password123',
      elo: 1200
    };

    const player = await PlayerModel.create(validPlayer);
    expect(player.username).toBe(validPlayer.username);
    expect(player.elo).toBe(validPlayer.elo);
    expect(player.color).toBeNull();
    expect(player.password).toBeDefined();
    expect(player.password).not.toBe(validPlayer.password); // Should be hashed
  });

  it('should require username', async () => {
    const playerWithoutUsername = {
      password: 'password123',
      elo: 1200
    };

    await expect(PlayerModel.create(playerWithoutUsername))
      .rejects.toThrow();
  });

  it('should verify password correctly', async () => {
    const player = await PlayerModel.create({
      username: 'testuser',
      password: 'password123',
      elo: 1200
    });

    const verifyResult = await player.verifyPassword('password123');
    expect(verifyResult).toBe(true);

    const wrongResult = await player.verifyPassword('wrongpassword');
    expect(wrongResult).toBe(false);
  });
});

describe('Game Model', () => {
  let player1: IPlayer;
  let player2: IPlayer;

  beforeEach(async () => {
    player1 = await PlayerModel.create({
      username: 'player1',
      password: 'password123'
    });

    player2 = await PlayerModel.create({
      username: 'player2',
      password: 'password123'
    });
  });

  it('should create a new game successfully', async () => {
    const validGame = {
      players: [player1._id, player2._id],
      status: 'waiting'
    };

    const game = await GameModel.create(validGame);
    expect(game.players).toHaveLength(2);
    expect(game.currentPlayerIndex).toBe(0);
    expect(game.status).toBe('waiting');
  });

  it('should require players', async () => {
    const gameWithoutPlayers = {
      status: 'waiting'
    };

    await expect(GameModel.create(gameWithoutPlayers))
      .rejects.toThrow();
  });

  it('should populate player references', async () => {
    const game = await GameModel.create({
      players: [player1._id, player2._id],
      status: 'waiting'
    });

    const populatedGame = await GameModel.findById(game._id)
      .populate('players')
      .exec();

    expect(populatedGame?.players[0]).toHaveProperty('username', 'player1');
    expect(populatedGame?.players[1]).toHaveProperty('username', 'player2');
  });
});
