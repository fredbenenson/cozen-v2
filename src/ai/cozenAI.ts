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
import { Card, Color } from "../types/game";
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
  redPlayer?: Player;    // Add redPlayer reference
  blackPlayer?: Player;  // Add blackPlayer reference
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
      columns: currentRound.columns || [],
      redPlayer: currentRound.redPlayer,
      blackPlayer: currentRound.blackPlayer
    };

    // Start the minimax search from the current game state with the AI player's color
    this.minimax(aiRound, 0, true, -Infinity, Infinity);

    // IMPORTANT: Lodash's _.sortBy creates new sorted arrays and OVERWRITES previous sorts.
    // Instead of chaining that overwrites, we need to sort by multiple criteria at once.

    // Debug the scores before sorting
    if (this.debugEnabled) {
      console.log("Move scores before sorting:");
      this.moveScores.forEach((move, idx) => {
        console.log(`  Move ${idx}: ${move.cards.join(',')} at column ${move.column}, score=${move.score}`);
      });
    }

    let moves = _.orderBy(
      this.moveScores,
      [
        // Primary sort: score (descending)
        (m) => m.score === Infinity ? Infinity : (m.score === -Infinity ? -Infinity : (m.score || 0)),
        // Secondary sort: card length (ascending)
        (m) => m.cards.length
      ],
      ['desc', 'asc'] // Sort directions
    );

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
    if (this.debugEnabled) {
      console.log(`AI minimax called: depth=${depth}, maximizing=${maximizing}, maxDepth=${this.maxDepth}`);
    }
    // Terminal condition or max depth reached
    if (round.state === "complete" || depth <= this.maxDepth) {
      if (this.debugEnabled) {
        console.log(`AI minimax reached terminal condition: round state=${round.state}, depth=${depth}, maxDepth=${this.maxDepth}`);
      }
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

      if (this.debugEnabled) {
        console.log(`Terminal node at depth ${depth}: VP diff = ${vpDiff} (${maximizing ? 'max' : 'min'} node)`);
      }
      return vpDiff;
    }

    // CRITICAL FIX: Determine the player based on maximizing, not the round's activePlayer
    // This ensures we're considering the correct player for each turn in minimax alternation
    let currentPlayer: Player;
    let currentPlayerColor: Color;
    
    // For maximizing (AI's turn), use this.player
    // For minimizing (opponent's turn), use the opponent
    if (maximizing) {
      currentPlayer = this.player;
      currentPlayerColor = this.player.color;
    } else {
      // Find the opponent based on color
      if (this.player.color === Color.Black) {
        currentPlayer = round.redPlayer || { color: Color.Red } as Player;
        currentPlayerColor = Color.Red;
      } else {
        currentPlayer = round.blackPlayer || { color: Color.Black } as Player;
        currentPlayerColor = Color.Black;
      }
    }

    if (this.debugEnabled) {
      console.log(`Using active player ${currentPlayerColor} at depth ${depth} (${maximizing ? 'maximizing' : 'minimizing'})`);
      // Verify maximizing flag correctly corresponds to AI player's turn
      const isAITurn = currentPlayer.color === this.player.color;
      if (maximizing !== isAITurn) {
        console.log(`  - WARNING: Player/maximizing mismatch! maximizing=${maximizing}, but AI player=${this.player.color}, active=${currentPlayerColor}`);
      }
    }

    // Generate all possible moves for the current player with explicit color
    const moves = this.generateMoves(round, currentPlayerColor);

    // If there are no valid moves, evaluate the state as is instead of returning -Infinity/-Infinity
    if (moves.length === 0) {
      if (this.debugEnabled) {
        console.log(`No valid moves for ${currentPlayerColor} at depth=${depth}, evaluating state as is`);
      }

      // Score the board as is - don't propagate -Infinity
      if (typeof round.score_board === "function") {
        round.score_board();
      }

      // Calculate VP difference
      const vpDiff =
        this.player.color === Color.Black
          ? (round.victory_point_scores?.black || 0) -
            (round.victory_point_scores?.red || 0)
          : (round.victory_point_scores?.red || 0) -
            (round.victory_point_scores?.black || 0);

      return vpDiff;
    }

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
          
          // Verify the active player was switched correctly
          if (this.debugEnabled && child.activePlayer.color === currentPlayerColor) {
            console.log(`WARNING: Player not switched after move! Still ${child.activePlayer.color}`);
          }
        }

        // Recursive minimax call
        child.score = this.minimax(child, depth - 1, !maximizing, alpha, beta);
        best = Math.max(best, child.score);

        if (this.debugEnabled) {
          console.log(`Maximizing node depth=${depth}: child score=${child.score}, current best=${best}`);
        }

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

          if (this.debugEnabled) {
            console.log(`Root move ${index}: minimax score=${child.score}, original move score=${move.score}, final score=${finalScore}`);
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
          
          // Verify the active player was switched correctly
          if (this.debugEnabled && child.activePlayer.color === currentPlayerColor) {
            console.log(`WARNING: Player not switched after move! Still ${child.activePlayer.color}`);
          }
        }

        // Recursive minimax call
        child.score = this.minimax(child, depth - 1, !maximizing, alpha, beta);
        best = Math.min(best, child.score);

        if (this.debugEnabled) {
          console.log(`Minimizing node depth=${depth}: child score=${child.score}, current best=${best}`);
        }

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
   * @param round The current game round
   * @param playerColor The color of the player to generate moves for (required)
   * @returns Array of possible moves
   */
  private generateMoves(round: AIRound, playerColor: Color): AIMove[] {
    // Get the correct player based on color
    let activePlayer: Player | undefined;

    // Get the player based on the specified color
    if (playerColor === Color.Black && round.blackPlayer) {
      activePlayer = round.blackPlayer;
    } else if (playerColor === Color.Red && round.redPlayer) {
      activePlayer = round.redPlayer;
    } else {
      // Fallback to active player if specific player not found
      activePlayer = round.activePlayer;

      // If we're using the active player but its color doesn't match what we need,
      // this indicates a problem in player switching
      if (activePlayer && activePlayer.color !== playerColor) {
        if (this.debugEnabled) {
          console.log(`WARNING: Active player ${activePlayer.color} doesn't match requested color ${playerColor}!`);
          console.log(`  - This indicates a problem with player switching in minimax`);
        }

        // Try to find the correct player
        if (playerColor === Color.Black && activePlayer.color !== Color.Black) {
          // We need black but have red, look for any black player
          if (round.blackPlayer) {
            if (this.debugEnabled) console.log(`  - Found blackPlayer, using it instead`);
            activePlayer = round.blackPlayer;
          }
        } else if (playerColor === Color.Red && activePlayer.color !== Color.Red) {
          // We need red but have black, look for any red player
          if (round.redPlayer) {
            if (this.debugEnabled) console.log(`  - Found redPlayer, using it instead`);
            activePlayer = round.redPlayer;
          }
        }
      }
    }

    if (this.debugEnabled) {
      console.log(`Generating moves for ${playerColor} player:`,
        activePlayer ? `Found player with ${activePlayer.hand?.length || 0} cards` : 'No player found');
    }

    if (!activePlayer) {
      console.error('No active player found for move generation');
      return [];
    }

    // Generate wager moves using the selected player and color
    const wagers = this.generateWagerMoves(round, activePlayer, playerColor).map((move) => ({
      ...move,
      didStake: false,
      isStake: false,
    }));

    // Generate stake moves
    const stakes: AIMove[] = [];

    // Use the selected player for stake moves
    if (activePlayer && activePlayer.availableStakes && activePlayer.availableStakes.length > 0) {
      // Get all available stake columns and sort by preference
      // (player's side first, as they're more valuable)
      const availableColumns = [...activePlayer.availableStakes].sort((a, b) => {
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

      // Filter cards to only those matching the player's color
      const playerHand = activePlayer.hand.filter((card: any) => {
        const cardColor = typeof card === 'object' ? card.color : null;
        return cardColor === playerColor;
      });

      // For each card, create a stake move for each available column
      playerHand.forEach((card: any) => {
        // Get the card number for evaluation
        const cardNumber = typeof card === 'object' ? (card.number || 0) :
          (typeof card === 'string' && card.includes('_')) ?
          parseInt(card.split('_')[1]) : 0;

        // Calculate initial stake value based on card value
        let stakeValue = (card.victoryPoints || card.victory_points || 0) * 0.5;

        // Check if there's a matching card in hand to form a pair later
        const cardNumbers = playerHand.map((c: any) =>
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
          StakeService.isValidStakeColumn(column, activePlayer, round as unknown as Round)
        );

        // Add a move for each valid stake column
        validStakeColumns.forEach(column => {
          // Adjust value based on column position
          let columnValue = stakeValue;

          // Prefer player's side of the board
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
            playerName: activePlayer.name || "",
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

    // IMPORTANT: Use orderBy to sort by multiple criteria in a specific order,
    // rather than chaining sortBy which overwrites previous sorts
    return _.orderBy(
      allMoves,
      [
        // Primary sort: score (descending)
        (m) => m.score === Infinity ? Infinity : (m.score || 0),
        // Secondary sort: card length (ascending)
        (m) => m.cards.length
      ],
      ['desc', 'asc'] // Sort directions
    );
  }

  /**
   * Generate all possible wager moves
   * @param round The current game round
   * @param player The player to generate moves for
   * @param playerColor The color of the player (required to ensure proper card filtering)
   */
   private generateWagerMoves(round: AIRound, player: Player, playerColor: Color): AIMove[] {
     const allMoves: AIMove[] = [];

     // Get all staked columns
     const stakedColumns = this.getStakedColumns(round);

     // Skip if no staked columns
     if (stakedColumns.length === 0) {
       if (this.debugEnabled) {
         console.log(`No staked columns found, can't generate wager moves`);
       }
       return allMoves;
     }

     // IMPORTANT: Filter player's hand to only include cards of the player's color
     // First, check if we're using the correct player
     if (player.color !== playerColor) {
       if (this.debugEnabled) {
         console.log(`WARNING: Player ${player.color} doesn't match requested color ${playerColor}!`);
         console.log(`  - This likely means we're using the wrong player object`);

         // If we have player refs in the round, use them
         if (playerColor === Color.Red && round.redPlayer) {
           console.log(`  - Found redPlayer in round, switching to it`);
           player = round.redPlayer;
         } else if (playerColor === Color.Black && round.blackPlayer) {
           console.log(`  - Found blackPlayer in round, switching to it`);
           player = round.blackPlayer;
         } else {
           console.log(`  - No matching player found in round, filtering will likely fail`);
         }
       }
     }

     // Now filter the cards
     const validHand = player.hand.filter((card: any) => {
       const cardColor = typeof card === 'object' ? card.color : null;
       const isValid = cardColor === playerColor;  // Match the exact color passed in

       if (this.debugEnabled && !isValid) {
         console.log(`Filtered out card ${card.id || card} because color ${cardColor} doesn't match ${playerColor}`);
       }

       return isValid;
     });

     if (this.debugEnabled) {
       console.log(`Generating moves for player ${playerColor}:`);
       console.log(`  - Original hand: ${player.hand.map((c: any) => c.id || c).join(', ')}`);
       console.log(`  - Valid hand: ${validHand.map((c: any) => c.id || c).join(', ')}`);
       console.log(`  - Staked columns: ${stakedColumns.join(', ')}`);
     }

     // Generate all permutations of the filtered hand
     const permutations = generateHandPermutations(validHand);

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

         // Check if stake card has an owner
         if (this.debugEnabled) {
           console.log(`Evaluating stake card at column ${column}:`,
             stakeCard.owner ? `owned by player ${stakeCard.owner.color}` : 'no owner');
         }

         // Evaluate hand strength
         const score = this.evaluateHand(
           cardNumbers,
           stakeCard.owner === player ? stakeCard.number : -1
         );

         if (this.debugEnabled) {
           console.log(`Hand evaluation for ${cardNumbers.join(',')} with stake ${stakeCard.number}: ${score.value}`);
         }

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
           playerName: player.name,
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
      const columns = round.staked_columns();
      if (this.debugEnabled) {
        console.log(`Found staked columns via function: ${columns.join(', ')}`);
      }
      return columns;
    } else if (round.columns && Array.isArray(round.columns)) {
      // New implementation format
      const columns = round.columns
        .map((column: any, index: number) =>
          column.stakedCard || this.getStakeCardPosition(round, index)
            ? index
            : -1,
        )
        .filter((index: number) => index !== -1);

      if (this.debugEnabled) {
        console.log(`Found staked columns via filter: ${columns.join(', ')}`);
      }
      return columns;
    }

    if (this.debugEnabled) {
      console.log('No staked columns found!');
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
      if (this.debugEnabled) {
        console.log(`Found stake card at column ${columnIndex}: ${round.columns[columnIndex].stakedCard?.id || 'unknown'}`);
      }
      return { card: round.columns[columnIndex].stakedCard };
    } else if (round.columns[columnIndex]) {
      // Original implementation with positions array
      const maxCards = 5; // MAX_CARDS_PER_HAND constant
      const result = round.columns[columnIndex][maxCards];
      if (this.debugEnabled) {
        console.log(`Checked original structure for column ${columnIndex}, found: ${result ? 'stake card' : 'no stake card'}`);
      }
      return result;
    }

    if (this.debugEnabled) {
      console.log(`No stake card found at column ${columnIndex}`);
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
