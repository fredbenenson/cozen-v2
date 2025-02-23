import { CardEvaluation } from "../services/cardEvaluation";

export enum AIDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

export interface AIDecisionContext {
  hand: number[];
  stake: number;
  difficulty: AIDifficulty;
  cardsPlayed: number[];
  opponentCardCount: number;
}

interface GameState {
  hand: number[];
  opponentCards: number[];
  stake: number;
  strength: number;
}

export class CozenAI {
  private static readonly MAX_DEPTH = 4;
  private static readonly MAX_NODES = 1000;
  private static readonly DIFFICULTY_LAMBDAS = {
    [AIDifficulty.EASY]: 2.0, // More random
    [AIDifficulty.MEDIUM]: 1.2, // Somewhat random
    [AIDifficulty.HARD]: 0.5, // Most optimal
  };

  private static nodeCount = 0;
  private static debugEnabled = false;
  private static debugMoves: any[] = [];
  private static debugDepth = 0;
  private static currentContext: AIDecisionContext;

  public static enableDebug(): void {
    this.debugEnabled = true;
  }

  public static disableDebug(): void {
    this.debugEnabled = false;
  }

  public static shouldChallengeCozen(context: AIDecisionContext): boolean {
    this.nodeCount = 0;
    this.debugMoves = [];
    this.currentContext = context; // Store for debugging

    const initialState: GameState = {
      hand: [...context.hand],
      opponentCards: [...context.cardsPlayed],
      stake: context.stake,
      strength: CardEvaluation.evaluateHand(context.hand, context.stake)
        .strength,
    };

    // Calculate the best move score
    const score = this.minimax(
      initialState,
      this.MAX_DEPTH,
      true,
      -Infinity,
      Infinity,
    );

    if (this.debugEnabled) {
      this.summarizeSearch();
    }

    // Use Poisson distribution to potentially choose suboptimal move
    return this.shouldMakeMove(score, context.difficulty);
  }

  private static minimax(
    state: GameState,
    depth: number,
    isMaximizing: boolean,
    alpha: number,
    beta: number,
  ): number {
    this.nodeCount++;

    // Terminal conditions
    if (
      this.nodeCount > this.MAX_NODES ||
      depth === 0 ||
      state.hand.length === 0
    ) {
      return state.strength;
    }

    const moves = this.generateMoves(state);

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of moves) {
        // For each move, we need to consider ALL possible opponent responses
        const newState = this.applyMove(state, move);
        const score = this.minimax(newState, depth - 1, false, alpha, beta);

        if (depth === this.MAX_DEPTH) {
          this.debugMoves.push({ move, score });
        }

        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      // Generate opponent's possible moves
      const opponentMoves = this.generateOpponentMoves(
        state.opponentCards.length,
      );
      for (const move of opponentMoves) {
        const newState = {
          ...state,
          opponentCards: [...state.opponentCards, ...move],
        };
        const score = this.minimax(newState, depth - 1, true, alpha, beta);
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return minScore;
    }
  }

  private static generateMoves(state: GameState): any[] {
    const moves: any[] = [];
    const hand = [...state.hand].sort((a, b) => a - b);

    // Single cards
    for (let i = 0; i < hand.length; i++) {
      moves.push({
        cards: [hand[i]],
        strength: CardEvaluation.evaluateHand([hand[i]], state.stake).strength,
      });
    }

    // Pairs
    for (let i = 0; i < hand.length - 1; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        if (hand[i] === hand[j]) {
          moves.push({
            cards: [hand[i], hand[j]],
            strength: CardEvaluation.evaluateHand(
              [hand[i], hand[j]],
              state.stake,
            ).strength,
          });
        }
      }
    }

    // Runs (all possible lengths)
    for (let len = 2; len <= hand.length; len++) {
      for (let i = 0; i <= hand.length - len; i++) {
        const run = hand.slice(i, i + len);
        if (this.isRun(run)) {
          moves.push({
            cards: [...run],
            strength: CardEvaluation.evaluateHand(run, state.stake).strength,
          });
        }
      }
    }

    return moves;
  }

  private static isRun(cards: number[]): boolean {
    for (let i = 1; i < cards.length; i++) {
      if (cards[i] !== cards[i - 1] + 1) return false;
    }
    return true;
  }

  private static generateOpponentMoves(currentCards: number): number[][] {
    // Generate possible opponent moves based on remaining cards
    const possibleMoves: number[][] = [];
    // Single cards
    for (let i = 1; i <= 13; i++) {
      possibleMoves.push([i]);
    }
    // Pairs
    for (let i = 1; i <= 13; i++) {
      possibleMoves.push([i, i]);
    }
    // Runs (length 3)
    for (let i = 1; i <= 11; i++) {
      possibleMoves.push([i, i + 1, i + 2]);
    }
    return possibleMoves;
  }

  private static applyMove(state: GameState, move: any): GameState {
    const newHand = state.hand.filter((card) => !move.cards.includes(card));
    return {
      hand: newHand,
      opponentCards: state.opponentCards,
      stake: state.stake,
      strength: CardEvaluation.evaluateHand(newHand, state.stake).strength,
    };
  }

  private static shouldMakeMove(
    score: number,
    difficulty: AIDifficulty,
  ): boolean {
    const lambda = this.DIFFICULTY_LAMBDAS[difficulty];
    const randomFactor = this.rpois(lambda);
    return score > randomFactor;
  }

  private static rpois(lambda: number): number {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;

    do {
      k++;
      p *= Math.random();
    } while (p > L);

    return k - 1;
  }
  private static logTopMoves(): void {
    if (!this.debugEnabled) return;

    console.log("\n=== Top 10 Moves ===");
    const sortedMoves = [...this.debugMoves].sort((a, b) => b.score - a.score);
    const topMoves = sortedMoves.slice(0, 10);

    console.table(
      topMoves.map((move, i) => ({
        rank: i + 1,
        score: move.score.toFixed(2),
        cards: move.move.cards.join(","),
        strength: move.move.strength,
        depth: this.MAX_DEPTH,
      })),
    );

    console.log(`\nTotal moves considered: ${this.debugMoves.length}`);
    console.log(`Total nodes evaluated: ${this.nodeCount}`);
    console.log("===========================\n");
  }

  private static summarizeSearch(): void {
    if (!this.debugEnabled) return;

    console.log("\n=== AI Decision Summary ===");
    console.log("Game State:");
    console.log(
      JSON.stringify(
        {
          opponentPlayedCards: this.currentContext.opponentCardCount,
          stake: this.currentContext.stake,
          aiHand: this.currentContext.hand,
        },
        null,
        2,
      ),
    );

    // Top moves summary only
    console.log("\nTop Moves:");
    const topMoves = [...this.debugMoves]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((move, i) => ({
        rank: i + 1,
        score: move.score.toFixed(2),
        cards: move.move.cards,
        type: this.categorizeMoveType(move.move),
      }));

    console.table(topMoves);
    console.log(`\nTotal nodes evaluated: ${this.nodeCount}`);
    console.log("===========================\n");
  }

  private static categorizeMoveType(move: any): string {
    const cards = move.cards;
    if (cards.length === 1) return "Single";
    if (cards.length === 2) {
      return cards[0] === cards[1] ? "Pair" : "Run2";
    }
    if (this.isRun(cards)) return `Run${cards.length}`;
    return "Other";
  }
}
