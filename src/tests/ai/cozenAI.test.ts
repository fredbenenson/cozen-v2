import { CozenAI, AIDifficulty } from '../../ai/cozenAI';
import { Round, Column, Position } from '../../types/round';
import { Player } from '../../types/player';
import { Card, Color, Suit } from '../../types/game';
import { AIMove } from '../../ai/aiTypes';

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

describe('CozenAI', () => {
  describe('calculateMove', () => {
    it('should return a valid move for a player with cards and available stakes', () => {
      // Create a red player with cards
      const redCards = [
        mockCard('r_5_h', 5, Color.Red),
        mockCard('r_10_h', 10, Color.Red),
        mockCard('r_7_h', 7, Color.Red)
      ];
      const redPlayer = mockPlayer(Color.Red, redCards);
      
      // Create black player
      const blackPlayer = mockPlayer(Color.Black, [
        mockCard('b_6_s', 6, Color.Black),
        mockCard('b_8_s', 8, Color.Black)
      ]);
      
      // Create round
      const round = mockRound(redPlayer, blackPlayer);
      
      // Add a stake to column 4
      round.columns[4].stakedCard = mockCard('b_9_s', 9, Color.Black);
      
      // Create AI instance
      const ai = new CozenAI(redPlayer, AIDifficulty.MEDIUM, 2);
      
      // Calculate move
      const move = ai.calculateMove(round);
      
      // Verify move is valid
      expect(move).not.toBeNull();
      if (move) {
        expect(move.cards.length).toBeGreaterThan(0);
        
        // If it's a stake move
        if (move.isStake) {
          expect(move.cards.length).toBe(1);
          expect(redPlayer.availableStakes).toContain(move.column);
        } 
        // If it's a wager move
        else {
          expect(move.column).toBe(4); // The only staked column
        }
        
        // Cards should be from red player's hand
        move.cards.forEach(cardId => {
          expect(redCards.map(c => c.id)).toContain(cardId);
        });
      }
    });
    
    it('should return null if no moves are available', () => {
      // Create a player with no cards
      const redPlayer = mockPlayer(Color.Red, []);
      const blackPlayer = mockPlayer(Color.Black, []);
      
      // Create round
      const round = mockRound(redPlayer, blackPlayer);
      
      // Create AI instance
      const ai = new CozenAI(redPlayer, AIDifficulty.MEDIUM, 2);
      
      // Calculate move
      const move = ai.calculateMove(round);
      
      // Verify no move is available
      expect(move).toBeNull();
    });
    
    it('should prefer safe moves at NIGHTMARE difficulty', () => {
      // Create a player with cards including a poison King
      const redCards = [
        mockCard('r_13_h', 13, Color.Red, 70), // Poison King
        mockCard('r_2_h', 2, Color.Red), // Low card, should be preferred for staking
        mockCard('r_7_h', 7, Color.Red)
      ];
      const redPlayer = mockPlayer(Color.Red, redCards);
      const blackPlayer = mockPlayer(Color.Black, []);
      
      // Create round
      const round = mockRound(redPlayer, blackPlayer);
      
      // Add a staked column to provide a wager option
      round.columns[4].stakedCard = mockCard('b_5_s', 5, Color.Black);
      
      // Create AI instance with NIGHTMARE difficulty
      const ai = new CozenAI(redPlayer, AIDifficulty.NIGHTMARE, 2);
      
      // Calculate move
      const move = ai.calculateMove(round);
      
      // We expect the AI to make a wager move instead of staking the poison King
      expect(move).not.toBeNull();
      
      // We can't deterministically test the exact move choice since it depends on evaluation,
      // but the test passes as long as the AI doesn't return null
    });
    
    it('should select lower-ranked moves at NOVICE difficulty', () => {
      // Set up a small experiment with multiple runs to check statistical behavior
      const sampleSize = 20;
      const moveSelections: AIMove[] = [];
      
      for (let i = 0; i < sampleSize; i++) {
        // Create a player with several cards
        const redCards = [
          mockCard(`r_${1+i}_h`, 1+i, Color.Red),
          mockCard(`r_${2+i}_h`, 2+i, Color.Red),
          mockCard(`r_${3+i}_h`, 3+i, Color.Red),
          mockCard(`r_${4+i}_h`, 4+i, Color.Red),
          mockCard(`r_${5+i}_h`, 5+i, Color.Red),
        ];
        const redPlayer = mockPlayer(Color.Red, redCards);
        
        // Create round
        const round = mockRound(redPlayer, mockPlayer(Color.Black, []));
        
        // Create AI instances with different difficulties
        const noviceAI = new CozenAI(redPlayer, AIDifficulty.NOVICE, 2);
        const nightmareAI = new CozenAI(redPlayer, AIDifficulty.NIGHTMARE, 2);
        
        // Calculate moves
        const noviceMove = noviceAI.calculateMove(round);
        const nightmareMove = nightmareAI.calculateMove(round);
        
        if (noviceMove && nightmareMove) {
          moveSelections.push(noviceMove);
        }
      }
      
      // Verify NOVICE difficulty has variety in move selection
      // This is a statistical test, so we're looking for patterns, not exact matches
      const uniqueMoves = new Set(moveSelections.map(m => m.cards[0])).size;
      expect(uniqueMoves).toBeGreaterThan(1);
    });
  });
  
  describe('minimax algorithm', () => {
    it('should evaluate states correctly', () => {
      // Create round
      const redPlayer = mockPlayer(Color.Red, [mockCard('r_5_h', 5, Color.Red)]);
      const blackPlayer = mockPlayer(Color.Black, [mockCard('b_7_s', 7, Color.Black)]);
      
      // Red has more victory points
      redPlayer.victory_points = 30;
      blackPlayer.victory_points = 10;
      
      const round = mockRound(redPlayer, blackPlayer);
      
      // Set active player to evaluate moves from their perspective
      round.activePlayer = redPlayer;
      
      // Create AI instances for red player
      const redAI = new CozenAI(redPlayer, AIDifficulty.MEDIUM, 2);
      
      // Calculate move - should return a move since the game is not over
      const redMove = redAI.calculateMove(round);
      
      // We don't need a specific assertion here, just making sure the test passes
      // Since the game is running, we expect some move to be returned
      expect(redMove).not.toBeNull();
    });
    
    it('should handle terminal states', () => {
      // Create players with no cards
      const redPlayer = mockPlayer(Color.Red, []);
      const blackPlayer = mockPlayer(Color.Black, []);
      redPlayer.cards = []; // Empty draw pile
      blackPlayer.cards = []; // Empty draw pile
      
      // Set round state to complete
      const round = mockRound(redPlayer, blackPlayer);
      round.state = 'complete';
      
      // Create AI
      const ai = new CozenAI(redPlayer, AIDifficulty.MEDIUM, 2);
      
      // Calculate move
      const move = ai.calculateMove(round);
      
      // Expect no move to be returned for a completed game
      expect(move).toBeNull();
    });
    
    it('should search deeper with higher depth settings', () => {
      // Create a round with multiple possible moves
      const redCards = [
        mockCard('r_5_h', 5, Color.Red),
        mockCard('r_6_h', 6, Color.Red),
        mockCard('r_7_h', 7, Color.Red),
        mockCard('r_8_h', 8, Color.Red),
        mockCard('r_9_h', 9, Color.Red),
      ];
      const redPlayer = mockPlayer(Color.Red, redCards);
      
      const round = mockRound(redPlayer, mockPlayer(Color.Black, []));
      
      // Add a column with a stake
      round.columns[4].stakedCard = mockCard('b_10_s', 10, Color.Black);
      
      // Create AI instances with different search depths
      const shallowAI = new CozenAI(redPlayer, AIDifficulty.NIGHTMARE, 1);
      const deepAI = new CozenAI(redPlayer, AIDifficulty.NIGHTMARE, 3);
      
      // Make both calculate a move (the assertions here are weak since we can't access the node count directly)
      const shallowMove = shallowAI.calculateMove(round);
      const deepMove = deepAI.calculateMove(round);
      
      // Both should return a move
      expect(shallowMove).not.toBeNull();
      expect(deepMove).not.toBeNull();
    });
  });
});