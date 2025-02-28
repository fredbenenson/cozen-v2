import _ from "lodash";
import {
  AIDifficulty,
  DIFFICULTY_VALUES,
  DIFFICULTY_SCALAR,
  AIMove,
  AIDecisionResult,
} from "./aiTypes";
import { Player } from "../types/player";
import { Round } from "../types/round";
import { Color } from "../types/game";
import { CardEvaluation } from "../services/cardEvaluation";
import { StakeService } from "../services/stakeService";
import {
  rpois,
  deduplicateHands,
  filterStakedPairs,
  copyRound,
  hidePoison,
  generateHandPermutations,
} from "./aiUtils";

// Define a custom interface that we'll use for AI operations
// Without extending Round to avoid type conflicts
interface AIRound {
  state: string;
  activePlayer: Player;
  name?: string;
  score?: number;
  move?: (move: AIMove) => void;
  score_board?: () => void;
  victory_point_scores?: {
    black: number;
    red: number;
  };
  staked_columns?: () => number[];
  columns: any[];
}

/**
 * Implementation of the CozenAI based on the original AIOpponent
 * Simplified to match the behavior of the original implementation
 */
export class CozenAI {
  private player: Player;
  private game: any;
  private maxDepth: number;
  private difficulty: number;
  private moveScores: AIMove[] = [];
  private totalNodeCount: number = 0;
  private debugEnabled: boolean = false;

  /**
   * Create a new AI instance
   */
  constructor(
    game: any,
    player: Player,
    difficulty: AIDifficulty = AIDifficulty.MEDIUM,
    searchDepth: number = 4,
  ) {
    this.player = player;
    this.game = game;
    this.maxDepth = searchDepth * -1; // Negative to match original implementation
    this.difficulty = DIFFICULTY_VALUES[difficulty];

    if (this.debugEnabled) {
      console.log("AI Opponent initialized with:", {
        player: player.name,
        color: player.color,
        difficulty,
        searchDepth,
      });
    }
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
   * Calculate and return the AI's move
   */
  public calculateMove(round?: Round): AIMove | null {
    const result = this.calculateMoveWithStats(round);
    return result.move;
  }

  /**
   * Calculate the AI's move with detailed statistics
   */
  public calculateMoveWithStats(round?: Round): AIDecisionResult {
    const startTime = performance.now();
    this.moveScores = [];
    this.totalNodeCount = 0;

    const currentRound = round || (this.game && this.game.round);
    if (!currentRound) {
      console.error("No round available for AI to calculate move");
      return this.createEmptyResult();
    }

    // Don't calculate moves for completed rounds or if AI is not the active player
    if (
      currentRound.state === "complete" ||
      currentRound.activePlayer !== this.player
    ) {
      return this.createEmptyResult();
    }

    // Make sure the player has cards
    if (
      !this.player.hand ||
      !Array.isArray(this.player.hand) ||
      this.player.hand.length === 0
    ) {
      return this.createEmptyResult();
    }

    // Adjust difficulty based on hand size (matches original implementation)
    let adjustedDifficulty = this.difficulty;
    for (let i = 5; i > this.player.hand.length; i--) {
      adjustedDifficulty *= DIFFICULTY_SCALAR;
    }

    if (this.debugEnabled) {
      console.log(
        `AI calculating move at ${adjustedDifficulty} difficulty level`,
      );
    }

    // Convert the Round to our AIRound interface
    const aiRound: AIRound = {
      ...currentRound as any,
      name: "",
      columns: currentRound.columns || []
    };

    // Start the minimax search from the current game state
    this.minimax(aiRound, 0, true, -Infinity, Infinity);

    // Sort moves by card count (ascending) and then by score (descending)
    // This ordering ensures score takes priority while breaking ties with card count
    let moves = _.chain(this.moveScores)
      .sortBy((m) => (m.score || 0) * -1)  // Sort by score descending (highest first)
      .sortBy((m) => m.cards.length)  // Then sort by card length (shorter first)
      .sortBy((m) => (m.score || 0) * -1)  // Re-sort by score to ensure it takes priority
      .value();

    // Filter out moves that split pairs
    filterStakedPairs(moves, this.player.hand);

    // Remove duplicate moves and those that split pairs
    moves = deduplicateHands(moves).filter((m) => !m.splitPair);

    // Handle the case where no valid moves were found
    if (moves.length === 0) {
      // Fallback: just stake a random card if possible
      if (
        this.player.availableStakes &&
        this.player.availableStakes.length > 0 &&
        this.player.hand.length > 0
      ) {
        const fallbackMove: AIMove = {
          cards: [typeof this.player.hand[0].id === 'string'
            ? this.player.hand[0].id
            : `${this.player.hand[0].color}_${this.player.hand[0].number}`],
          column: this.player.availableStakes[0],
          didStake: true,
          isStake: true,  // Make sure this is not undefined
          playerName: this.player.name || '',
          gameId: typeof this.game?.key === 'string' ? this.game.key : ''
        };

        return {
          move: fallbackMove,
          moveIndex: -1,
          candidateMoves: [fallbackMove],
          nodeCount: this.totalNodeCount,
          elapsedTimeMs: performance.now() - startTime,
          adjustedDifficulty,
        };
      }
      return this.createEmptyResult();
    }

    // Select a move based on difficulty
    let moveIndex = 0;

    // For NIGHTMARE difficulty, always pick the best move (index 0)
    if (this.difficulty === DIFFICULTY_VALUES[AIDifficulty.NIGHTMARE]) {
      moveIndex = 0;
    } else {
      // For other difficulties, use Poisson distribution with better weighting toward good moves
      // Also limit the randomness more to avoid making clearly bad moves
      const maxMoveIndex = Math.min(Math.floor(moves.length / 2), 5); // Only consider top half of moves, max 5
      moveIndex = Math.min(rpois(adjustedDifficulty), maxMoveIndex);
    }

    const chosenMove = moves[moveIndex];

    if (this.debugEnabled) {
      console.log("Total nodes evaluated:", this.totalNodeCount);
      console.log("Moves evaluated:", moves.length);
      console.log("Selected move index:", moveIndex);
      console.log("Selected move:", chosenMove);
    }

    return {
      move: chosenMove,
      moveIndex,
      candidateMoves: moves,
      nodeCount: this.totalNodeCount,
      elapsedTimeMs: performance.now() - startTime,
      adjustedDifficulty,
    };
  }

  /**
   * Create an empty result for cases where no move can be calculated
   */
  private createEmptyResult(): AIDecisionResult {
    return {
      move: null,
      moveIndex: -1,
      candidateMoves: [],
      nodeCount: 0,
      elapsedTimeMs: 0,
      adjustedDifficulty: this.difficulty,
    };
  }

  /**
   * Minimax algorithm with alpha-beta pruning
   * Core AI search function, port of the original implementation
   */
  private minimax(
    round: AIRound,
    depth: number,
    maximizing: boolean,
    alpha: number,
    beta: number,
  ): number {
    // Terminal condition or max depth reached
    if (round.state === "complete" || depth <= this.maxDepth) {
      // Cast to any to avoid type errors with hidePoison function
      hidePoison(round as any, this.player.color);

      if (typeof round.score_board === "function") {
        round.score_board();
      }

      // Calculate victory points difference (from AI's perspective)
      const vpDiff =
        this.player.color === Color.Black
          ? (round.victory_point_scores?.black || 0) -
            (round.victory_point_scores?.red || 0)
          : (round.victory_point_scores?.red || 0) -
            (round.victory_point_scores?.black || 0);

      return vpDiff;
    }

    // Generate all possible moves
    const moves = this.generateMoves(round);

    if (maximizing) {
      // AI is maximizing (its turn)
      let best = -Infinity;

      for (let index = 0; index < moves.length; index++) {
        const move = moves[index];
        // Cast the round to any to avoid type issues with copyRound
        const child = copyRound(round as any, index) as AIRound;

        this.totalNodeCount++;

        // Apply move to the child state
        if (typeof child.move === "function") {
          child.move(move);
        }

        // Recursive minimax call
        child.score = this.minimax(child, depth - 1, !maximizing, alpha, beta);
        best = Math.max(best, child.score);

        // Store moves at the root level
        if (depth === 0) {
          if (this.debugEnabled) {
            process.stdout.write(
              `Analyzing moves: ${((index / moves.length) * 100).toFixed(0)}%\r`,
            );
          }
          // For initial moves where the minimax value is 0, use the calculated move score
          // This preserves the evaluation heuristics when the VP difference is 0
          let finalScore = child.score;

          if (finalScore === 0) {
            // Use the original score that was calculated by generateMoves
            finalScore = move.score || 0;
          }

          this.moveScores.push({ ...move, score: finalScore });
        }

        // Alpha-beta pruning
        if (best >= beta) {
          break; // Beta cutoff
        }

        alpha = Math.max(alpha, best);
      }

      return best;
    } else {
      // Opponent is minimizing
      let best = Infinity;

      for (let index = 0; index < moves.length; index++) {
        const move = moves[index];
        // Cast the round to any to avoid type issues with copyRound
        const child = copyRound(round as any, index) as AIRound;

        this.totalNodeCount++;

        // Apply move to the child state
        if (typeof child.move === "function") {
          child.move(move);
        }

        // Recursive minimax call
        child.score = this.minimax(child, depth - 1, !maximizing, alpha, beta);
        best = Math.min(best, child.score);

        // Alpha-beta pruning
        if (best <= alpha) {
          break; // Alpha cutoff
        }

        beta = Math.min(beta, best);
      }

      return best;
    }
  }

  /**
   * Generate all possible moves for the current state
   */
  private generateMoves(round: AIRound): AIMove[] {
    // Generate wager moves
    const wagers = this.generateWagerMoves(round).map((move) => ({
      ...move,
      didStake: false,
      isStake: false,
    }));

    // Generate stake moves
    const stakes: AIMove[] = [];
    if (
      round.activePlayer.availableStakes &&
      round.activePlayer.availableStakes.length > 0
    ) {
      // Get all available stake columns and sort by preference
      // (player's side first, as they're more valuable)
      const availableColumns = [...round.activePlayer.availableStakes].sort((a, b) => {
        const playerColor = round.activePlayer.color;
        const isPlayerSideA = (playerColor === Color.Red && a >= 5) || (playerColor === Color.Black && a < 5);
        const isPlayerSideB = (playerColor === Color.Red && b >= 5) || (playerColor === Color.Black && b < 5);

        // Player's side columns first
        if (isPlayerSideA && !isPlayerSideB) return -1;
        if (!isPlayerSideA && isPlayerSideB) return 1;

        // Then middle columns (4-5)
        const distFromCenterA = Math.min(Math.abs(a - 4), Math.abs(a - 5));
        const distFromCenterB = Math.min(Math.abs(b - 4), Math.abs(b - 5));
        return distFromCenterA - distFromCenterB;
      });

      // For each card, create a stake move for each available column
      round.activePlayer.hand.forEach((card: any) => {
        // Get the card number for evaluation
        const cardNumber = typeof card === 'object' ? (card.number || 0) :
          (typeof card === 'string' && card.includes('_')) ?
          parseInt(card.split('_')[1]) : 0;

        // Calculate initial stake value based on card value
        let stakeValue = (card.victoryPoints || card.victory_points || 0) * 0.5;

        // Check if there's a matching card in hand to form a pair later
        const cardNumbers = round.activePlayer.hand.map((c: any) =>
          typeof c === 'object' ? c.number :
          (typeof c === 'string' && c.includes('_')) ? parseInt(c.split('_')[1]) : 0
        );

        // Count occurrences of this card in hand
        const pairPotential = cardNumbers.filter(n => n === cardNumber).length;
        if (pairPotential > 1) {
          stakeValue += 2; // Bonus for having a potential pair
        }

        // Filter for valid stake columns only
        const validStakeColumns = availableColumns.filter(column =>
          StakeService.isValidStakeColumn(column, round.activePlayer, round as unknown as Round)
        );

        // Add a move for each valid stake column
        validStakeColumns.forEach(column => {
          // Adjust value based on column position
          let columnValue = stakeValue;

          // Prefer player's side of the board
          const playerColor = round.activePlayer.color;
          const isPlayerSide = (playerColor === Color.Red && column >= 5) ||
                              (playerColor === Color.Black && column < 5);
          if (isPlayerSide) {
            columnValue += 0.5;
          }

          // Create the move
          stakes.push({
            cards: [card.id || card.card_id || card],
            column,
            didStake: true,
            isStake: true,
            strength: pairPotential > 1 ? 2 : 0, // Strength for having pair potential
            value: columnValue,
            score: columnValue, // Initial score estimate
            playerName: round.activePlayer.name || "",
            gameId: this.game?.key || "",
          });
        });
      });
    }

    // Combine all possible moves
    const typedWagers = wagers as AIMove[];
    const typedStakes = stakes as AIMove[];
    const allMoves = typedWagers.concat(typedStakes);

    // For each move, calculate a heuristic score if one isn't set
    allMoves.forEach(move => {
      if (move.score === undefined) {
        // For stake moves
        if (move.isStake) {
          // Get the card number being staked
          const cardId = move.cards[0];
          let cardNumber = 0;

          if (typeof cardId === 'string' && cardId.includes('_')) {
            cardNumber = parseInt(cardId.split('_')[1]);
          } else if (typeof cardId === 'object') {
            cardNumber = (cardId as any).number || 0;
          }

          // For stake moves, we need to set a meaningful score since CardEvaluation gives 0 for single cards

          // 1. Add base value from card number (higher cards are better to stake)
          let baseValue = cardNumber >= 11 ? cardNumber : cardNumber * 0.5;

          // 2. Add significant bonus for face cards (J, Q, K, A)
          const cardValueBonus = cardNumber >= 11 ? (cardNumber - 10) * 1.0 : 0;

          // 3. Add bonus for potential pairs (already calculated in move.strength)
          const pairBonus = (move.strength || 0) * 2; // Amplify the importance of potential pairs

          // 4. Add position value (column preference)
          const positionBonus = (move.value || 0);

          // Final score combines all factors
          move.score = baseValue + cardValueBonus + pairBonus + positionBonus;
        }
        // For play moves
        else {
          // Get card numbers from IDs
          const cardNumbers = move.cards.map(id => {
            if (typeof id === 'string' && id.includes('_')) {
              return parseInt(id.split('_')[1]);
            } else if (typeof id === 'object') {
              return (id as any).number || 0;
            }
            return 0;
          }).filter(n => n > 0);

          // Get stake card number if available
          let stakeNumber = -1;
          const stakeColumn = round.columns[move.column];
          if (stakeColumn && stakeColumn.stakedCard) {
            stakeNumber = stakeColumn.stakedCard.number || -1;
          }

          // Evaluate hand strength
          const hValue = this.evaluateHand(cardNumbers, stakeNumber).value;
          move.score = hValue + (move.strength || 0);
        }
      }
    });

    // Sort moves: prioritizing score (descending) over card count (ascending for efficiency)
    return _.chain(allMoves)
      .sortBy((m) => -(m.score || 0))  // Sort by score descending
      .sortBy((m) => m.cards.length)   // Then sort by card length
      .sortBy((m) => -(m.score || 0))  // Re-sort by score to ensure it takes priority
      .value();
  }

  /**
   * Generate all possible wager moves
   */
   private generateWagerMoves(round: AIRound): AIMove[] {
     const allMoves: AIMove[] = [];

     // Get all staked columns
     const stakedColumns = this.getStakedColumns(round);

     // Skip if no staked columns
     if (stakedColumns.length === 0) {
       return allMoves;
     }

     // Generate all permutations of the hand
     const permutations = generateHandPermutations(round.activePlayer.hand);

     // For each staked column, evaluate all possible card combinations
     stakedColumns.forEach(column => {
       // Get the stake card
       const stakeCardPosition = this.getStakeCardPosition(round, column);
       if (!stakeCardPosition || !stakeCardPosition.card) return;

       const stakeCard = stakeCardPosition.card;

       // For each permutation, calculate its strength
       permutations.forEach(hand => {
         if (hand.length === 0) return;

         // Get card numbers
         const cardNumbers = hand.map((c: any) => c.number);

         // Evaluate hand strength
         const score = this.evaluateHand(
           cardNumbers,
           stakeCard.owner === round.activePlayer ? stakeCard.number : -1
         );

         // Calculate total value of the hand
         const value = hand.reduce((sum: number, card: any) => {
           return sum + (card.victoryPoints || card.victory_points || 0);
         }, 0);

         // Create the move
         allMoves.push({
           cards: hand.map((c: any) => c.id || c.card_id || ''),
           column,
           strength: score.value,
           value,
           playerName: round.activePlayer.name,
           gameId: this.game?.key || "",
           didStake: false,
           isStake: false
         });
       });
     });

     return allMoves;
   }

  /**
   * Get all columns that have staked cards
   */
  private getStakedColumns(round: AIRound): number[] {
    // Look for columns with staked cards
    if (round.staked_columns && typeof round.staked_columns === "function") {
      // Original implementation method
      return round.staked_columns();
    } else if (round.columns && Array.isArray(round.columns)) {
      // New implementation format
      return round.columns
        .map((column: any, index: number) =>
          column.stakedCard || this.getStakeCardPosition(round, index)
            ? index
            : -1,
        )
        .filter((index: number) => index !== -1);
    }

    return [];
  }

  /**
   * Get the stake card position in a column
   */
  private getStakeCardPosition(round: AIRound, columnIndex: number): any {
    // Make sure columns is defined and has the item we're looking for
    if (!round.columns || !Array.isArray(round.columns) ||
        columnIndex < 0 || columnIndex >= round.columns.length) {
      return null;
    }

    // Handle different possible structures
    if (round.columns[columnIndex] && round.columns[columnIndex].stakedCard) {
      // New structure with stakedCard property
      return { card: round.columns[columnIndex].stakedCard };
    } else if (round.columns[columnIndex]) {
      // Original implementation with positions array
      const maxCards = 5; // MAX_CARDS_PER_HAND constant
      return round.columns[columnIndex][maxCards];
    }

    return null;
  }

  /**
   * Evaluate the strength of a hand
   * Uses CardEvaluation service
   */
  private evaluateHand(hand: number[], stake: number): { value: number } {
    // Try to use the existing evaluator if available
    if (this.game && this.game.evaluator && this.game.evaluator.evaluateHand) {
      const result = this.game.evaluator.evaluateHand(hand, stake);
      return { value: result.strength || 0 };
    }

    // Use the imported CardEvaluation service directly
    try {
      const result = CardEvaluation.evaluateHand(hand, stake);
      if (this.debugEnabled) {
        // console.log("CardEvaluation result:", result);
      }
      return { value: result.strength || 0 };
    } catch (error) {
      if (this.debugEnabled) {
        console.log("Error using CardEvaluation:", error);
      }
    }

    // If we get here, we couldn't evaluate the hand
    if (this.debugEnabled) {
      console.log("Failed to evaluate hand, returning 0");
    }
    return { value: 0 };
  }
}

// Re-export for convenience
export { AIDifficulty, AIMove } from "./aiTypes";
