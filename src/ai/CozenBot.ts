/**
 * CozenBot - Custom AI implementation for boardgame.io
 * 
 * This bot uses our existing CozenAI implementation and ensures proper state management
 * during the search process.
 */

// No Bot interface in boardgame.io/ai, we'll implement our own
import { CozenAI, AIDifficulty } from './cozenAI';
import { CozenState, Card, Color } from '../types/game';
import { Player } from '../types/player';
import { cloneRound, evaluateGameState } from './aiUtils';
import { Round } from '../types/round';
import { Ctx } from 'boardgame.io';
import { convertToRound, convertAIMovesToBoardgameMoves } from './boardgameAIAdapter';

// Define a Bot interface similar to what boardgame.io would provide
interface Bot {
  play(state: { G: any, ctx: any }): any;
}

interface BotAction {
  action: {
    type: string;
    payload: {
      type: string;
      args: any[];
      playerID?: string;
    };
  };
}

/**
 * A custom Bot implementation that uses our existing CozenAI for move calculation
 */
export class CozenBot implements Bot {
  private ai: CozenAI;
  private difficulty: AIDifficulty;
  private playerID: string;
  private playerColor: 'red' | 'black';
  private debugMode: boolean;

  /**
   * Constructor for CozenBot
   */
  constructor(
    playerID: string = '1',
    difficulty: AIDifficulty = AIDifficulty.MEDIUM,
    debugMode: boolean = false
  ) {
    // Output a very visible message showing the bot is being created
    console.log('=== COZEN BOT CONSTRUCTOR CALLED ===');
    console.log(`Creating CozenBot for player ${playerID} with difficulty ${difficulty}`);
    console.log('===============================');
    this.playerID = playerID;
    this.playerColor = playerID === '0' ? 'red' : 'black';
    this.difficulty = difficulty;
    this.debugMode = debugMode;

    // Create a placeholder player - we'll update this with actual state later
    const player: Player = {
      id: playerID,
      name: playerID === '0' ? 'Red Player' : 'AI Player',
      color: playerID === '0' ? Color.Red : Color.Black,
      hand: [],
      jail: [],
      cards: [],
      victory_points: 0,
      availableStakes: [],
      stake_offset: playerID === '0' ? 1 : -1,
      drawUp: () => {},
      reset: () => {}
    };

    // Create the AI instance
    this.ai = new CozenAI(
      player,
      difficulty,
      difficulty === AIDifficulty.NIGHTMARE ? 4 : 
      difficulty === AIDifficulty.HARD ? 3 : 
      difficulty === AIDifficulty.MEDIUM ? 2 : 1
    );

    if (this.debugMode) {
      this.ai.enableDebug();
      console.log(`CozenBot created for player ${playerID} with difficulty ${difficulty}`);
    }
  }

  /**
   * Play method required by the Bot interface
   * This is called by boardgame.io to get the bot's move
   */
  play(state: { G: CozenState, ctx: Ctx }): BotAction | undefined {
    // Log when the play method is called
    console.log('=== COZEN BOT PLAY METHOD CALLED ===');
    console.log(`CozenBot.play called for player ${this.playerID}`);
    
    // Validate state
    if (!state || !state.G || !state.ctx) {
      console.error("Invalid state passed to CozenBot.play");
      return undefined;
    }

    const { G, ctx } = state;

    // Log what we're doing
    if (this.debugMode) {
      console.log(`CozenBot play method called for player ${this.playerID}`);
      console.log(`Current player in ctx: ${ctx.currentPlayer}`);
      console.log(`Active player in G: ${G.activePlayer}`);
    }

    // Only make moves when it's this bot's turn
    if (ctx.currentPlayer !== this.playerID) {
      if (this.debugMode) {
        console.log(`Not ${this.playerID}'s turn, skipping move`);
      }
      return undefined;
    }

    try {
      // Convert boardgame.io state to our Round format
      const round = convertToRound(G);

      // Make sure the active player is set correctly in the round
      const expectedActiveColor = this.playerID === '0' ? 'red' : 'black';
      if (round.activePlayer.color.toLowerCase() !== expectedActiveColor) {
        // Fix the active player if needed
        const fixedActivePlayer = expectedActiveColor === 'red' ? round.redPlayer : round.blackPlayer;
        const fixedInactivePlayer = expectedActiveColor === 'red' ? round.blackPlayer : round.redPlayer;

        // Create a fixed round with proper activePlayer
        const fixedRound = {
          ...round,
          activePlayer: fixedActivePlayer,
          inactivePlayer: fixedInactivePlayer
        };

        // Use the fixed round for our AI
        return this.calculateAndConvertMove(fixedRound);
      }

      // Use the round as-is since activePlayer is correct
      return this.calculateAndConvertMove(round);
    } catch (error) {
      console.error("Error in CozenBot.play:", error);
      return undefined;
    }
  }

  /**
   * Calculate a move using our AI and convert to boardgame.io format
   */
  private calculateAndConvertMove(round: Round): BotAction | undefined {
    try {
      // Create a deep copy of the round to avoid state pollution
      const roundCopy = cloneRound(round);

      // Calculate the move using our CozenAI
      const moveResult = this.ai.calculateMove(roundCopy);

      if (!moveResult) {
        if (this.debugMode) {
          console.log("AI couldn't find a valid move");
        }
        return undefined;
      }

      // Log the calculated move if in debug mode
      if (this.debugMode) {
        console.log("AI move calculated:", moveResult);
      }

      // Convert our AI move to boardgame.io format
      const boardgameMoves = convertAIMovesToBoardgameMoves([moveResult], this.playerID);

      if (!boardgameMoves || boardgameMoves.length === 0) {
        if (this.debugMode) {
          console.log("Could not convert AI move to boardgame.io format");
        }
        return undefined;
      }

      // Extract the first (and only) move
      const { move, args } = boardgameMoves[0];

      // Return the move in boardgame.io's expected format
      return {
        action: {
          type: 'MAKE_MOVE',
          payload: {
            type: move,
            args: args,
            playerID: this.playerID
          }
        }
      };
    } catch (error) {
      console.error("Error calculating move:", error);
      return undefined;
    }
  }

  /**
   * A simple heuristic evaluation for the minimax algorithm
   * Returns a score between -1 and 1, where higher is better for the player
   */
  public evaluate(state: { G: CozenState, ctx: Ctx }): number {
    try {
      const { G } = state;
      
      // Convert to our Round format for evaluation
      const round = convertToRound(G);
      
      // Evaluate the state for this player's color
      const score = evaluateGameState(round, this.playerColor === 'red' ? 'Red' : 'Black');
      
      // Normalize to -1 to 1 range
      return score / 100;
    } catch (error) {
      console.error("Error in CozenBot.evaluate:", error);
      return 0; // Neutral score on error
    }
  }
}

// We're now properly importing the function from boardgameAIAdapter.ts