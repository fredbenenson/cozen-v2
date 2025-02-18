import { GameService } from '../services/gameService';
import { createMockPlayer, createMockCard } from './testUtils';

describe('GameService', () => {
  it('should initialize a new game correctly', () => {
    const player1 = createMockPlayer();
    const player2 = createMockPlayer();
    
    const game = GameService.initializeGame(player1, player2);
    
    expect(game.players).toHaveLength(2);
    expect(game.status).toBe('waiting');
  });
});