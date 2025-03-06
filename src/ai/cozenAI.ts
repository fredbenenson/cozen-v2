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

}

// Re-export for convenience
export { AIDifficulty, AIMove } from "./aiTypes";
