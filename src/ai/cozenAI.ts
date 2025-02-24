import { Move, Color } from '../types/game';
import { Player } from '../types/player';
import { Round } from '../types/round';
import _ from 'lodash';

import { AIDifficulty, DIFFICULTY_VALUES, MoveOption } from './aiTypes';
import { rpois, filterStakedPairs, deduplicateHands } from './aiUtils';
import { Minimax, MinimaxSearchResult } from './minimax';

/**
 * Result of AI move calculation including the move and stats
 */
export interface AIDecisionResult {
  move: Move | null;
  searchResult: MinimaxSearchResult;
  selectedMoveIndex: number;
  finalCandidateMoves: MoveOption[];
  adjustedDifficulty: number;
}

/**
 * Cozen AI implementation based on minimax algorithm with alpha-beta pruning
 */
export class CozenAI {
  private player: Player;
  private game: any;
  private maxDepth: number;
  private difficulty: number;
  private debugEnabled: boolean = false;

  /**
   * Create a new AI instance
   *
   * @param game The game state
   * @param player The AI player
   * @param difficulty The AI difficulty level
   * @param searchDepth The search depth for minimax
   */
  constructor(game: any, player: Player, difficulty: AIDifficulty = AIDifficulty.MEDIUM, searchDepth: number = 4) {
    this.player = player;
    this.game = game;
    this.maxDepth = -searchDepth; // Negative because we count down
    this.difficulty = DIFFICULTY_VALUES[difficulty];
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
   * Calculate and return the optimal move with search statistics
   */
  public calculateMoveWithStats(round?: Round): AIDecisionResult {
    const currentRound = round || (this.game && this.game.round);

    const emptyResult: AIDecisionResult = {
      move: null,
      searchResult: { moves: [], nodeCount: 0, elapsedTimeMs: 0 },
      selectedMoveIndex: -1,
      finalCandidateMoves: [],
      adjustedDifficulty: this.difficulty
    };

    if (!currentRound) {
      console.error('No round available for AI to calculate move');
      return emptyResult;
    }

    // Don't calculate moves for completed rounds or if AI is not the active player
    if (currentRound.state === 'complete' || currentRound.activePlayer !== this.player) {
      return emptyResult;
    }

    // Make sure the player has cards
    if (!this.player.hand || !Array.isArray(this.player.hand) || this.player.hand.length === 0) {
      return emptyResult;
    }

    // Adjust difficulty based on hand size
    let adjustedDifficulty = this.difficulty;
    for (let i = 5; i > this.player.hand.length; i--) {
      adjustedDifficulty *= 0.75; // DIFFICULTY_SCALAR
    }

    if (this.debugEnabled) {
      console.log(`AI calculating move at ${adjustedDifficulty} difficulty level`);
    }

    // Initialize minimax search algorithm
    const minimax = new Minimax(this.player.color, this.debugEnabled);

    // Start minimax search
    const searchResult = minimax.search(currentRound, this.maxDepth);

    // Check if we found any moves
    if (!searchResult.moves || searchResult.moves.length === 0) {
      // Fallback: just stake a random card if possible
      if (this.player.availableStakes && this.player.availableStakes.length > 0) {
        const fallbackMove = {
          playerId: this.player.name || '',
          cards: [this.player.hand[0]],
          column: this.player.availableStakes[0],
          isStake: true
        };

        return {
          move: fallbackMove,
          searchResult,
          selectedMoveIndex: -1,
          finalCandidateMoves: [],
          adjustedDifficulty
        };
      }
      return emptyResult;
    }

    // Sort moves by score (descending) and then by card count (ascending)
    let moves = _.chain(searchResult.moves)
      .sortBy((m: MoveOption) => m.cards.length)
      .sortBy((m: MoveOption) => m.score ? -m.score : 0)
      .value();

    // Filter out moves that split pairs
    filterStakedPairs(moves, this.player.hand);

    // Remove duplicate moves and those that split pairs
    moves = deduplicateHands(moves)
      .filter((m: MoveOption) => !m.splitPair);

    if (moves.length === 0) {
      // Fallback: just stake a random card if possible
      if (this.player.availableStakes && this.player.availableStakes.length > 0) {
        const fallbackMove = {
          playerId: this.player.name || '',
          cards: [this.player.hand[0]],
          column: this.player.availableStakes[0],
          isStake: true
        };

        return {
          move: fallbackMove,
          searchResult,
          selectedMoveIndex: -1,
          finalCandidateMoves: [],
          adjustedDifficulty
        };
      }
      return emptyResult;
    }

    // Select a move based on difficulty (using Poisson distribution)
    const moveIndex = Math.min(rpois(adjustedDifficulty), moves.length - 1);
    const chosenMove = moves[moveIndex];

    if (this.debugEnabled) {
      // console.log('Scored moves:');
      // console.log(moves);
      // console.log('Total nodes evaluated:', searchResult.nodeCount);
      // console.log('Chosen move:', chosenMove);
    }

    // Make sure we have valid cards to play
    const validCardsToPlay = chosenMove.cards
      .map((cardId: string) => this.player.hand.find(c => c && c.id === cardId))
      .filter((card: any) => card !== undefined);

    if (validCardsToPlay.length === 0 && !chosenMove.isStake) {
      return emptyResult;
    }

    // Convert to Move interface
    const selectedMove = {
      playerId: this.player.name || '',
      cards: validCardsToPlay as any[], // TypeScript needs this cast
      column: chosenMove.column,
      isStake: chosenMove.isStake
    };

    return {
      move: selectedMove,
      searchResult,
      selectedMoveIndex: moveIndex,
      finalCandidateMoves: moves,
      adjustedDifficulty
    };
  }

  /**
   * Original calculate move method (now calls the extended version)
   */
  public calculateMove(round?: Round): Move | null {
    return this.calculateMoveWithStats(round).move;
  }
}

// Re-export for convenience
export { AIDifficulty } from './aiTypes';
