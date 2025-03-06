import { AIService } from '../../services/ai/aiService';
import { AIDifficulty } from '../../ai/aiTypes';
import { Round, Column, Position } from '../../types/round';
import { Player } from '../../types/player';
import { Card, Color, Suit } from '../../types/game';

// Helper to create a mock card
const mockCard = (id: string, number: number, color: string, victoryPoints: number = number): Card => ({
  id,
  number,
  color: color as Color,
  suit: color === Color.Red ? Suit.Hearts : Suit.Spades,
  victoryPoints,
  played: false
});

// Helper to create a mock player
const mockPlayer = (color: string, cards: Card[]): Player => ({
  color: color as Color,
  name: `${color} player`,
  hand: [...cards],
  jail: [],
  cards: [], // deck
  victory_points: 0,
  availableStakes: [0, 1, 2],
  stake_offset: 0,
  drawUp: jest.fn(),
  reset: jest.fn()
});

// Helper to create a mock position
const mockPosition = (player: Player, row: number, col: number): Position => ({
  owner: player,
  n: row * 10 + col,
  coord: [row, col],
  card: undefined
});

// Helper to create a mock column
const mockColumn = (index: number, redPlayer: Player, blackPlayer: Player): Column => {
  const positions = [];
  
  // Create positions for the column (typically 3 rows)
  for (let row = 0; row < 3; row++) {
    positions.push(mockPosition(row < 2 ? blackPlayer : redPlayer, row, index));
  }
  
  return {
    positions,
    stakedCard: null as unknown as Card | undefined
  };
};

// Helper to create a mock round
const mockRound = (redPlayer: Player, blackPlayer: Player): Round => {
  const round = {
    redPlayer,
    blackPlayer,
    activePlayer: redPlayer,
    inactivePlayer: blackPlayer,
    firstRound: true,
    state: 'running',
    board: [],
    columns: [],
    turn: 1,
    cardsJailed: 0,
    victoryPointScores: {
      red: 0,
      black: 0
    },
    firstStakes: {
      red: [],
      black: []
    }
  } as Round;

  // Create the board grid (3x10)
  round.board = Array(3).fill(null).map((_, row) => 
    Array(10).fill(null).map((_, col) => 
      mockPosition(row < 2 ? blackPlayer : redPlayer, row, col)
    )
  );

  // Set up columns
  round.columns = Array(10).fill(null).map((_, index) => 
    mockColumn(index, redPlayer, blackPlayer)
  );

  return round;
};

describe('AIService', () => {
  describe('calculateMove', () => {
    it('should return a valid move using the AI', () => {
      // Create a round with players
      const redCards = [
        mockCard('r_5_h', 5, Color.Red),
        mockCard('r_10_h', 10, Color.Red),
        mockCard('r_7_h', 7, Color.Red)
      ];
      const redPlayer = mockPlayer(Color.Red, redCards);
      
      const blackPlayer = mockPlayer(Color.Black, [
        mockCard('b_6_s', 6, Color.Black),
        mockCard('b_8_s', 8, Color.Black)
      ]);
      
      const round = mockRound(redPlayer, blackPlayer);
      round.columns[4].stakedCard = mockCard('b_9_s', 9, Color.Black);
      
      // Calculate move using AIService
      const move = AIService.calculateMove(round, redPlayer, AIDifficulty.MEDIUM, 2);
      
      // Verify the move is valid
      expect(move).not.toBeNull();
      if (move) {
        expect(move.cards.length).toBeGreaterThan(0);
        
        // Cards should be from the player's hand
        move.cards.forEach(cardId => {
          expect(redCards.map(c => c.id)).toContain(cardId);
        });
      }
    });
    
    it('should handle different difficulty levels', () => {
      // Create a round with players
      const redCards = [
        mockCard('r_5_h', 5, Color.Red),
        mockCard('r_10_h', 10, Color.Red),
        mockCard('r_7_h', 7, Color.Red)
      ];
      const redPlayer = mockPlayer(Color.Red, redCards);
      const round = mockRound(redPlayer, mockPlayer(Color.Black, []));
      
      // Calculate moves with different difficulties
      const easyMove = AIService.calculateMove(round, redPlayer, AIDifficulty.EASY, 2);
      const hardMove = AIService.calculateMove(round, redPlayer, AIDifficulty.HARD, 2);
      const nightmareMove = AIService.calculateMove(round, redPlayer, AIDifficulty.NIGHTMARE, 2);
      
      // All should return valid moves
      expect(easyMove).not.toBeNull();
      expect(hardMove).not.toBeNull();
      expect(nightmareMove).not.toBeNull();
    });
    
    it('should handle different search depths', () => {
      // Create a round with players
      const redCards = [
        mockCard('r_5_h', 5, Color.Red),
        mockCard('r_10_h', 10, Color.Red),
        mockCard('r_7_h', 7, Color.Red)
      ];
      const redPlayer = mockPlayer(Color.Red, redCards);
      const round = mockRound(redPlayer, mockPlayer(Color.Black, []));
      
      // Calculate moves with different search depths
      const shallowMove = AIService.calculateMove(round, redPlayer, AIDifficulty.MEDIUM, 1);
      const deepMove = AIService.calculateMove(round, redPlayer, AIDifficulty.MEDIUM, 4);
      
      // Both should return valid moves
      expect(shallowMove).not.toBeNull();
      expect(deepMove).not.toBeNull();
    });
  });
  
  // Testing the route would require mocking Express and Mongoose
  // which is beyond the scope of this implementation
  describe('addAIMoveRoute', () => {
    it('should add a route to a router', () => {
      const mockRouter = {
        post: jest.fn()
      };
      
      AIService.addAIMoveRoute(mockRouter);
      
      // Verify that post was called with the correct path
      expect(mockRouter.post).toHaveBeenCalledWith(
        '/games/:gameId/ai-move',
        expect.any(Function)
      );
    });
  });
});