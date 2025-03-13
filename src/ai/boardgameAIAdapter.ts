/**
 * AI Adapter for boardgame.io
 * 
 * This file connects our minimax AI implementation to boardgame.io's bot system
 */

import { CozenState, Card, PlayerID, Column as BoardGameColumn } from '../types/game';
import { Ctx } from 'boardgame.io';
import { Player } from '../types/player';
import { CozenAI } from './cozenAI';
import { AIDifficulty } from './aiTypes';
import { Color } from '../types/game';
import { Round, Column as RoundColumn, Position as RoundPosition } from '../types/round';
import { generateStakeMoves, generateWagerMoves, evaluateGameState } from './aiUtils';

// This will hold our CozenAI instance
let aiInstance: CozenAI | null = null;

/**
 * Convert boardgame.io state to our Round format
 * This allows us to reuse our existing AI evaluation code
 */
function convertToRound(G: CozenState): Round {
  // Handle potentially undefined properties with defaults
  if (!G.players || !G.players.red || !G.players.black) {
    console.error("convertToRound: Invalid game state, missing players!");
    throw new Error("Invalid game state, missing players");
  }

  // Create Player objects from the boardgame.io player state
  const redPlayer: Player = {
    id: 'red-player',
    name: 'Red Player',
    color: Color.Red,
    hand: G.players.red.hand || [],
    jail: G.players.red.jail || [],
    cards: G.players.red.cards || [],
    victory_points: G.players.red.victory_points || 0,
    availableStakes: G.players.red.availableStakes || [],
    stake_offset: G.players.red.stake_offset || 1,
    drawUp: () => {},  // Dummy function since we don't need to modify state
    reset: () => {}    // Dummy function
  };
  
  const blackPlayer: Player = {
    id: 'black-player',
    name: 'AI Player',
    color: Color.Black,
    hand: G.players.black.hand || [],
    jail: G.players.black.jail || [],
    cards: G.players.black.cards || [],
    victory_points: G.players.black.victory_points || 0,
    availableStakes: G.players.black.availableStakes || [],
    stake_offset: G.players.black.stake_offset || -1,
    drawUp: () => {},  // Dummy function
    reset: () => {}    // Dummy function
  };
  
  // Determine active and inactive players with a fallback
  const activePlayer = (G.activePlayer === 'red' || G.activePlayer === 'black') 
    ? (G.activePlayer === 'red' ? redPlayer : blackPlayer)
    : blackPlayer; // Default to black if undefined
    
  const inactivePlayer = (G.activePlayer === 'red' || G.activePlayer === 'black')
    ? (G.activePlayer === 'red' ? blackPlayer : redPlayer)
    : redPlayer; // Default to red if undefined
  
  // Make sure board exists
  if (!G.board || !Array.isArray(G.board)) {
    console.error("convertToRound: Invalid game state, missing board!");
    throw new Error("Invalid game state, missing board");
  }
  
  // Convert columns format
  const columns: RoundColumn[] = G.board.map((boardColumn: BoardGameColumn) => {
    // Make sure positions array exists
    const positionsArray = boardColumn.positions || [];
    
    // Convert positions to Round format
    const positions: RoundPosition[] = positionsArray.map(pos => ({
      card: pos.card as Card | undefined, // Type assertion because Card | Card[] in game.ts
      owner: pos.owner === 'red' ? redPlayer : blackPlayer,
      n: pos.n || 0,
      coord: pos.coord || [0, 0]
    }));
    
    return {
      positions,
      stakedCard: boardColumn.stakedCard
    };
  });
  
  // Convert board from columns to 2D array of positions
  const board: RoundPosition[][] = [];
  
  // Initialize empty 10x10 board
  for (let row = 0; row < 10; row++) {
    board[row] = [];
    for (let col = 0; col < 10; col++) {
      board[row][col] = {
        owner: row < 5 ? blackPlayer : redPlayer,
        n: row * 10 + col,
        coord: [row, col]
      };
    }
  }
  
  // Fill in the board with actual position data
  G.board.forEach((column, colIndex) => {
    if (column.positions) {
      column.positions.forEach(pos => {
        if (pos.coord) {
          const [row, col] = pos.coord;
          if (row >= 0 && row < 10 && col >= 0 && col < 10) {
            board[row][col] = {
              card: pos.card as Card | undefined,
              owner: pos.owner === 'red' ? redPlayer : blackPlayer,
              n: pos.n || 0,
              coord: pos.coord
            };
          }
        }
      });
    }
  });
  
  // Map the round state with defaults
  const roundState = G.roundState || 'running';
  
  // Create the Round object with fallbacks for all properties
  return {
    redPlayer,
    blackPlayer,
    activePlayer,
    inactivePlayer,
    firstRound: G.isFirstRound || false,
    board,
    columns,
    state: roundState,
    turn: G.turnCount || 1,
    cardsJailed: G.cardsJailed || 0,
    victoryPointScores: G.victoryPointScores || { red: 0, black: 0 },
    firstStakes: G.firstStakes || { red: [], black: [] }
  };
}

/**
 * Convert our AI moves to boardgame.io format
 */
function convertAIMovesToBoardgameMoves(aiMoves: any[], playerID: string): Array<{move: string, args: any[]}> {
  return aiMoves.map(move => {
    if (move.isStake) {
      return {
        move: 'stakeCard',
        args: [move.cards[0]] // stakeCard takes a single card ID
      };
    } else {
      return {
        move: 'wagerCards',
        args: [move.cards, move.column] // wagerCards takes an array of card IDs and a column
      };
    }
  });
}

/**
 * Objective function for MCTSBot that uses our existing CozenAI minimax evaluation
 * 
 * @param G The game state
 * @param ctx The game context
 * @returns A score from 0 to 1 where higher is better for the AI
 */
export function minimaxObjective(G: CozenState, ctx: Ctx): number {
  try {
    // Make sure we're working with a proper G object
    const gameState = (G as any).G ? (G as any).G : G;
  
    // Check for valid game state
    if (!gameState || !gameState.players || !gameState.players.black) {
      console.error("minimaxObjective: Invalid game state!");
      return 0.5; // Return neutral score when state is invalid
    }
    
    // Create a player object for the AI (always black)
    const player: Player = {
      id: 'ai',
      name: 'AI',
      color: Color.Black,
      hand: gameState.players.black.hand || [],
      jail: gameState.players.black.jail || [],
      cards: gameState.players.black.cards || [],
      victory_points: gameState.players.black.victory_points || 0,
      availableStakes: gameState.players.black.availableStakes || [],
      stake_offset: gameState.players.black.stake_offset || -1,
      drawUp: () => {},  // Dummy function
      reset: () => {}    // Dummy function
    };
    
    // Initialize the AI with easy difficulty and a shallow search depth
    // to make evaluations fast enough for the MCTSBot
    if (!aiInstance) {
      aiInstance = new CozenAI(player, AIDifficulty.EASY, 2);
    }
    
    try {
      // Convert to our Round format for evaluation
      const round = convertToRound(gameState);
      
      // For simple evaluations, don't use the full minimax - just evaluate current state
      const score = evaluateGameState(round, "Black");
      
      // Normalize the score to 0-1 range
      // Minimax scores are usually between -100 and 100, so we map that to 0-1
      const normalizedScore = 0.5 + (score / 200);
      return Math.max(0, Math.min(1, normalizedScore));
    } catch (evalError) {
      console.error("Error evaluating game state:", evalError);
      
      // Fallback to simple victory point difference
      const blackScore = gameState.players.black.victory_points || 0;
      const redScore = gameState.players.red?.victory_points || 0;
      const scoreDifference = blackScore - redScore;
      
      // Normalize to 0-1 range, clamping between 0 and 1
      const normalizedScore = 0.5 + (scoreDifference / 140);
      return Math.max(0, Math.min(1, normalizedScore));
    }
  } catch (error) {
    console.error("Error in minimaxObjective:", error);
    return 0.5; // Return neutral score on error
  }
}

/**
 * Function to generate all legal moves for the AI
 * This reuses our existing AI move generation code
 */
export function enumerate(G: CozenState, ctx: Ctx, playerID?: string): Array<{move: string, args: any[]}> {
  // Make sure we're working with a proper G object
  const gameState = (G as any).G ? (G as any).G : G;
  
  if (!gameState || !gameState.players) {
    console.error("enumerate: G or G.players is missing!");
    return [];
  }
  
  // When called from the debug "Play" button, we need to ensure we generate moves for BLACK
  // Also verify if it's actually Black's turn in the game
  const currentTurn = gameState.activePlayer; // 'red' or 'black'
  
  // Debug object to inspect what's going on
  console.log("AI enumerate called with:", {
    hasG: !!gameState,
    hasPlayers: !!gameState.players,
    playerID,
    ctx: ctx,
    currentTurn,
    blackHand: gameState.players.black?.hand?.length
  });
  
  // Always force black moves when pressing "Play" in the AI panel
  if (playerID === '0') {
    console.log("enumerate: Not red's turn");
    return [];
  }
  
  // If it's not Black's turn in the real game, don't generate moves
  if (currentTurn !== 'black' && !ctx.turn) {
    console.log(`enumerate: Not black's turn in the game (current turn: ${currentTurn})`);
    return [];
  }
  
  // If no playerID, use current player from context but prioritize black
  if (!playerID) {
    // For MCTSBot simulations, use current player from context
    playerID = ctx.currentPlayer || '1';
    console.log(`enumerate: Using playerID ${playerID} from context`);
  }
  
  // For logging/debugging
  console.log(`enumerate: Generating moves for player ${playerID === '0' ? 'red' : 'black'}`);
  
  try {
    // Convert to our Round format
    const round = convertToRound(gameState);
    
    // Get the player object
    const player = playerID === '0' ? round.redPlayer : round.blackPlayer;
    
    // Generate moves using our existing functions
    let moves: any[] = [];
    
    // Generate stake moves
    const stakeMoves = generateStakeMoves(round, player);
    moves = moves.concat(stakeMoves);
    
    // Generate wager moves
    const wagerMoves = generateWagerMoves(round, player);
    moves = moves.concat(wagerMoves);
    
    // For debugging
    console.log(`enumerate: Generated ${moves.length} moves for player ${player.color.toLowerCase()}`);
    
    // Convert to boardgame.io format
    return convertAIMovesToBoardgameMoves(moves, playerID);
  } catch (error) {
    console.error("Error generating AI moves:", error);
    return [];
  }
}