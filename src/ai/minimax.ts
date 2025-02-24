import { GameNode, MoveOption } from './aiTypes';
import { AIEvaluation } from './aiEvaluation';
import { AIMoveGenerator } from './aiMoveGenerator';
import { copyRound } from './aiUtils';
import { Color } from '../types/game';

/**
 * Interface for minimax search results
 */
export interface MinimaxSearchResult {
  moves: MoveOption[];
  nodeCount: number;
  elapsedTimeMs: number;
}

/**
 * Implementation of the minimax algorithm with alpha-beta pruning for the AI
 */
export class Minimax {
  private totalNodeCount: number = 0;
  private maxNodes: number = Infinity;
  private debugEnabled: boolean = false;
  private playerColor: Color;
  private moveScores: MoveOption[] = [];
  private searchStartTime: number = 0;

  /**
   * Create a new minimax search instance
   */
  constructor(playerColor: Color, debugEnabled: boolean = false) {
    this.playerColor = playerColor;
    this.debugEnabled = debugEnabled;
    this.moveScores = [];
    this.totalNodeCount = 0;
  }

  /**
   * Start a minimax search from the given game state
   * Returns list of scored moves and search statistics
   */
  public search(round: any, maxDepth: number, maxNodes: number = Infinity): MinimaxSearchResult {
    this.totalNodeCount = 0;
    this.maxNodes = maxNodes;
    this.moveScores = [];
    this.searchStartTime = performance.now();

    // Start recursive minimax search
    this.minimax(round, 0, true, -Infinity, Infinity, maxDepth);

    const elapsedTimeMs = performance.now() - this.searchStartTime;

    if (this.debugEnabled) {
      console.log(`Total nodes evaluated: ${this.totalNodeCount}`);
      console.log(`Search time: ${elapsedTimeMs.toFixed(2)}ms`);
    }

    return {
      moves: this.moveScores,
      nodeCount: this.totalNodeCount,
      elapsedTimeMs
    };
  }

  /**
   * Recursive minimax implementation with alpha-beta pruning
   */
  private minimax(round: any, depth: number, maximizing: boolean, alpha: number, beta: number, maxDepth: number): number {
    if (this.totalNodeCount >= this.maxNodes) {
      return 0;
    }

    // Terminal condition or max depth reached
    if (round.state === 'complete' || depth <= maxDepth) {
      return AIEvaluation.evaluateState(round, this.playerColor);
    }

    if (maximizing) {
      // AI is maximizing (its turn)
      let best = -Infinity;
      const moves = AIMoveGenerator.generatePossibleMoves(round);

      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        const childRound = copyRound(round, i);
        this.totalNodeCount++;

        // Apply the move to the child round
        AIEvaluation.applyMove(childRound, move);

        // Recurse
        childRound.score = this.minimax(childRound, depth - 1, !maximizing, alpha, beta, maxDepth);

        best = Math.max(best, childRound.score);

        // Store the move at the root level
        if (depth === 0) {
          this.findOrCreateMove(childRound.score, move);
          if (this.debugEnabled) {
            process.stdout.write(`Analyzing moves: ${Math.round((i / moves.length) * 100)}%\r`);
          }
        }

        // Alpha-beta pruning
        const beatBeta = best >= beta;
        if (this.debugEnabled && depth <= 2) {
          this.writeNode(round, depth, childRound, move, maximizing, alpha, beta, beatBeta);
        }

        if (beatBeta) {
          break; // Beta cutoff
        }

        alpha = Math.max(alpha, best);
      }

      return best;
    } else {
      // Opponent is minimizing
      let best = Infinity;
      const moves = AIMoveGenerator.generatePossibleMoves(round);

      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        const childRound = copyRound(round, i);
        this.totalNodeCount++;

        // Apply the move to the child round
        AIEvaluation.applyMove(childRound, move);

        // Recurse
        childRound.score = this.minimax(childRound, depth - 1, !maximizing, alpha, beta, maxDepth);

        best = Math.min(best, childRound.score);

        // Alpha-beta pruning
        const beatAlpha = best <= alpha;
        if (this.debugEnabled && depth <= 2) {
          this.writeNode(round, depth, childRound, move, maximizing, alpha, beta, beatAlpha);
        }

        if (beatAlpha) {
          break; // Alpha cutoff
        }

        beta = Math.min(beta, best);
      }

      return best;
    }
  }

  /**
   * Write node information for debugging
   */
  private writeNode(round: any, depth: number, child: any, move: MoveOption, maximizing: boolean, alpha: number, beta: number, beatAlphaBeta: boolean): void {
    if (!this.debugEnabled) return;

    const node: GameNode = {
      source: round.name || 'root',
      target: child.name || 'child',
      n: this.totalNodeCount,
      depth,
      score: child.score || 0,
      childState: child.state,
      alphaBeta: maximizing ? `β:${beta}` : `α:${alpha}`,
      beatAlphaBeta,
      maximizing,
      cards: move.cards.join('|'),
      column: move.column,
      isStake: move.isStake
    };

    // console.log(node);
  }

  /**
   * Add or retrieve a move based on score
   */
  private findOrCreateMove(score: number, move?: MoveOption): MoveOption | undefined {
    if (move) {
      // Add the move with its score
      this.moveScores.push({ ...move, score });
      return undefined;
    } else {
      // Find a move by score, prioritizing the one with the fewest cards
      return this.moveScores
        .filter(m => m.score === score)
        .sort((a, b) => a.cards.length - b.cards.length)[0];
    }
  }

  /**
   * Get the total number of nodes evaluated
   */
  public getNodeCount(): number {
    return this.totalNodeCount;
  }

  /**
   * Get elapsed search time in milliseconds
   */
  public getElapsedTimeMs(): number {
    return performance.now() - this.searchStartTime;
  }
}
