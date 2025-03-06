import {
  AIDifficulty,
  AIMove,
  AIDecisionResult
} from "./aiTypes";
import { Player } from "../types/player";
import { Round, Position } from "../types/round";
import { Color } from "../types/game";
import { 
  generateStakeMoves, 
  generateWagerMoves, 
  evaluateGameState, 
  cloneRound, 
  poissonRandom, 
  hidePoison, 
  restorePoison,
  flagSplitPairs
} from "./aiUtils";

/**
 * Main AI implementation using minimax with alpha-beta pruning
 */
export class CozenAI {
  private player: Player;
  private maxDepth: number;
  private difficulty: AIDifficulty;
  private totalNodeCount: number = 0;
  private debugEnabled: boolean = false;
  private maxNodes: number = 10000; // Maximum number of nodes to explore
  private moveScores: AIMove[] = []; // For visualization

  /**
   * Create a new AI instance
   */
  constructor(
    player: Player,
    difficulty: AIDifficulty = AIDifficulty.MEDIUM,
    searchDepth: number = 4
  ) {
    this.player = player;
    this.maxDepth = searchDepth;
    this.difficulty = difficulty;
  }

  /**
   * Enable debug output
   */
  public enableDebug(): void {
    this.debugEnabled = true;
  }

  /**
   * Disable debug output
   */
  public disableDebug(): void {
    this.debugEnabled = false;
  }

  /**
   * Calculate a move with detailed statistics for visualization
   */
  public calculateMoveWithStats(round?: Round): AIDecisionResult {
    const startTime = Date.now();
    
    // Use the provided round or create a mock one if not provided
    const gameRound = round || {
      // If no round is provided, assume it's for visualization only
      state: 'active',
      activePlayer: this.player,
      inactivePlayer: null,
      redPlayer: this.player.color === Color.Red ? this.player : null,
      blackPlayer: this.player.color === Color.Black ? this.player : null,
      columns: []
    } as unknown as Round;
    
    // Clear move scores array for fresh tracking
    this.moveScores = [];
    
    // Calculate the move
    const move = this.calculateMove(gameRound);
    
    // Calculate time elapsed
    const timeElapsed = Date.now() - startTime;
    
    // Return detailed stats
    return {
      move,
      searchDepth: this.maxDepth,
      nodesExplored: this.totalNodeCount,
      timeElapsed,
      candidateMoves: this.moveScores.length
    };
  }

  /**
   * Calculate and return the AI's move
   */
  public calculateMove(round: Round): AIMove | null {
    this.totalNodeCount = 0;

    // Get player color
    const playerColor = this.player.color;
    
    // Generate all possible moves
    const allMoves = this.generateMoves(round, playerColor);
    
    if (allMoves.length === 0) {
      return null;
    }
    
    // Flag moves that would split pairs
    flagSplitPairs(allMoves, this.player.hand);
    
    // Evaluate each move using minimax
    for (const move of allMoves) {
      if (this.totalNodeCount >= this.maxNodes) {
        if (this.debugEnabled) {
          console.log(`Reached node limit (${this.maxNodes}). Stopping search.`);
        }
        break;
      }
      
      // Clone the game state
      const roundCopy = cloneRound(round);
      
      // Apply the move
      this.applyMove(roundCopy, move);
      
      // Hide opponent's poison (high-value) Kings during evaluation
      hidePoison(roundCopy, playerColor);
      
      // Use minimax to evaluate the move
      const score = this.minimax(
        roundCopy,
        this.maxDepth - 1,
        false, // Opponent's turn next, so minimizing
        -Infinity,
        Infinity,
        playerColor
      );
      
      // Restore original values
      restorePoison(roundCopy, playerColor);
      
      // Update move score
      move.score = score;
      
      if (this.debugEnabled) {
        console.log(`Move: ${JSON.stringify(move)} - Score: ${score}`);
      }
    }
    
    // Sort moves by score in descending order
    allMoves.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Store move scores for visualization
    this.moveScores = [...allMoves];
    
    if (this.debugEnabled) {
      console.log(`Generated ${allMoves.length} candidate moves`);
      console.log(`Explored ${this.totalNodeCount} nodes in search tree`);
      console.log(`Best move: ${JSON.stringify(allMoves[0])}`);
    }
    
    // Select move based on difficulty
    return this.selectMove(allMoves);
  }

  /**
   * Minimax algorithm with alpha-beta pruning
   */
  private minimax(
    round: Round, 
    depth: number, 
    maximizing: boolean, 
    alpha: number, 
    beta: number, 
    playerColor: string
  ): number {
    this.totalNodeCount++;
    
    // Terminal case - max depth reached or game over
    if (depth <= 0 || round.state === 'complete') {
      return evaluateGameState(round, playerColor);
    }
    
    // Determine current player's color (whose turn it is)
    const currentPlayerColor = maximizing ? playerColor : 
      (playerColor === Color.Red ? Color.Black : Color.Red);
      
    // Generate all legal moves for the current player
    const moves = this.generateMoves(round, currentPlayerColor);
    
    // If no moves available, evaluate current state
    if (moves.length === 0) {
      return evaluateGameState(round, playerColor);
    }
    
    if (maximizing) {
      let bestValue = -Infinity;
      
      for (const move of moves) {
        // Stop search if we've reached the maximum node count
        if (this.totalNodeCount >= this.maxNodes) {
          return bestValue;
        }
        
        // Create a deep copy of the state
        const roundCopy = cloneRound(round);
        
        // Apply the move to the child state
        this.applyMove(roundCopy, move);
        
        // Recursively evaluate
        const value = this.minimax(
          roundCopy, 
          depth - 1, 
          false, 
          alpha, 
          beta, 
          playerColor
        );
        
        bestValue = Math.max(bestValue, value);
        alpha = Math.max(alpha, bestValue);
        
        // Alpha-beta pruning
        if (beta <= alpha) break;
      }
      
      return bestValue;
    } else {
      let bestValue = Infinity;
      
      for (const move of moves) {
        // Stop search if we've reached the maximum node count
        if (this.totalNodeCount >= this.maxNodes) {
          return bestValue;
        }
        
        // Create a deep copy of the state
        const roundCopy = cloneRound(round);
        
        // Apply the move to the child state
        this.applyMove(roundCopy, move);
        
        // Recursively evaluate
        const value = this.minimax(
          roundCopy, 
          depth - 1, 
          true, 
          alpha, 
          beta, 
          playerColor
        );
        
        bestValue = Math.min(bestValue, value);
        beta = Math.min(beta, bestValue);
        
        // Alpha-beta pruning
        if (beta <= alpha) break;
      }
      
      return bestValue;
    }
  }
  
  /**
   * Generate all possible moves for a player
   */
  private generateMoves(round: Round, playerColor: string): AIMove[] {
    const player = playerColor === Color.Red ? round.redPlayer : round.blackPlayer;
    
    // Generate stake moves
    const stakeMoves = generateStakeMoves(round, player);
    
    // Generate wager moves
    const wagerMoves = generateWagerMoves(round, player);
    
    // Combine both types of moves
    const allMoves = [...stakeMoves, ...wagerMoves];
    
    return allMoves;
  }
  
  /**
   * Apply a move to a game state (simplified for minimax)
   */
  private applyMove(round: Round, move: AIMove): void {
    const currentPlayer = round.activePlayer;
    
    // Find the cards in player's hand
    const cardsToPlay = move.cards.map(cardId => 
      currentPlayer.hand.find(card => card.id === cardId)
    ).filter(card => card !== undefined);
    
    if (cardsToPlay.length !== move.cards.length) {
      if (this.debugEnabled) {
        console.error('Some cards not found in hand');
      }
      return;
    }
    
    // Simulate applying the move (simplified)
    if (move.isStake) {
      // Remove card from hand
      currentPlayer.hand = currentPlayer.hand.filter(card => card.id !== cardsToPlay[0]?.id);
      
      // Set stake for the column - ensure the column exists
      if (!round.columns) {
        round.columns = Array(10).fill(null).map(() => ({ positions: [] }));
      }
      
      // Create the column if it doesn't exist
      if (!round.columns[move.column]) {
        round.columns[move.column] = { positions: [] };
      }
      
      round.columns[move.column].stakedCard = cardsToPlay[0];
      
      // Update available stakes (correctly by removing the specific column)
      currentPlayer.availableStakes = currentPlayer.availableStakes.filter(col => col !== move.column);
      
      // Draw a new card if available (simplified)
      if (currentPlayer.cards.length > 0) {
        const newCard = currentPlayer.cards.shift();
        if (newCard) {
          currentPlayer.hand.push(newCard);
        }
      }
    } else {
      // Wager move - remove cards from hand
      for (const card of cardsToPlay) {
        currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== card.id);
      }
      
      // Add cards to the positions (simplified)
      // In a real implementation, this would involve finding available positions
      // For simulation purposes, this is sufficient as we're only interested in evaluation
      
      // Ensure columns exist
      if (!round.columns) {
        round.columns = Array(10).fill(null).map(() => ({ positions: [] }));
      }
      
      // Create the column if it doesn't exist
      if (!round.columns[move.column]) {
        round.columns[move.column] = { positions: [] };
      }
      
      // Ensure positions exist
      if (!round.columns[move.column].positions) {
        round.columns[move.column].positions = [];
      }
      
      // Find positions owned by the current player in the target column
      const playerPositions = round.columns[move.column].positions
        .filter(pos => pos?.owner?.color === currentPlayer.color && pos.card === undefined);
      
      // Place cards in positions (up to available positions)
      for (let i = 0; i < Math.min(cardsToPlay.length, playerPositions.length); i++) {
        playerPositions[i].card = cardsToPlay[i];
      }
    }
    
    // Ensure players are properly defined in the round
    if (!round.redPlayer) {
      round.redPlayer = currentPlayer.color === Color.Red ? currentPlayer : {
        color: Color.Red,
        name: 'Red',
        hand: [],
        availableStakes: [],
        cards: [],
        jail: [],
        victory_points: 0,
        stake_offset: 1,
        drawUp: () => {},
        reset: () => {}
      } as Player;
    }
    
    if (!round.blackPlayer) {
      round.blackPlayer = currentPlayer.color === Color.Black ? currentPlayer : {
        color: Color.Black,
        name: 'Black',
        hand: [],
        availableStakes: [],
        cards: [],
        jail: [],
        victory_points: 0,
        stake_offset: -1,
        drawUp: () => {},
        reset: () => {}
      } as Player;
    }
    
    // Switch active player based on color instead of name
    if (currentPlayer.color === Color.Red) {
      round.activePlayer = round.blackPlayer;
      round.inactivePlayer = round.redPlayer;
    } else {
      round.activePlayer = round.redPlayer;
      round.inactivePlayer = round.blackPlayer;
    }
    
    // Simple check for round completion (if a player has no cards)
    if (currentPlayer.hand.length === 0 && currentPlayer.cards.length === 0) {
      round.state = 'last_play';
      
      // If both players have no cards, round is complete
      const otherPlayer = round.activePlayer;
      if (otherPlayer.hand.length === 0 && otherPlayer.cards.length === 0) {
        round.state = 'complete';
      }
    }
  }
  
  /**
   * Select a move based on difficulty level
   */
  private selectMove(candidateMoves: AIMove[]): AIMove | null {
    if (candidateMoves.length === 0) {
      return null;
    }
    
    // NIGHTMARE difficulty always picks the best move
    if (this.difficulty === AIDifficulty.NIGHTMARE) {
      return candidateMoves[0];
    }
    
    // Limit the range of moves to consider based on difficulty
    const maxIndex = Math.min(
      Math.floor(candidateMoves.length / 2), 
      10
    );
    
    // Generate a Poisson-distributed random number based on difficulty
    const difficultyValue = this.difficulty as unknown as number;
    const index = Math.min(
      poissonRandom(difficultyValue || 0.5), 
      maxIndex
    );
    
    // Return the move at the calculated index
    return candidateMoves[Math.min(index, candidateMoves.length - 1)];
  }
}

// Re-export for convenience
export { AIDifficulty, AIMove } from "./aiTypes";