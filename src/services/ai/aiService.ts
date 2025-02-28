import { CozenAI, AIDifficulty } from '../../ai/cozenAI';
import { GameState, Move, BaseGameState } from '../../types/game';
import { Player } from '../../types/player';

export class AIService {
  /**
   * Calculate an AI move for a game
   */
  public static calculateMove(
    gameState: BaseGameState,
    difficulty: AIDifficulty = AIDifficulty.NIGHTMARE,
    searchDepth: number = 4
  ): Move | null {
    if (!gameState.round || gameState.status !== 'in_progress') {
      return null;
    }

    // Get the current active player
    const activePlayer = gameState.round.activePlayer;

    // Initialize the AI with the active player
    const ai = new CozenAI(gameState, activePlayer, difficulty, searchDepth);

    // Calculate AI move
    const result = ai.calculateMoveWithStats();

    if (!result.move) {
      return null;
    }

    // Convert from AIMove to game Move
    const move: Move = {
      playerId: activePlayer.id || '',
      cards: result.move.cards.map((cardId: string) => {
        // Find the card in the player's hand
        const card = activePlayer.hand.find((c: any) => c.id === cardId);
        return card!;
      }).filter((card: any) => card !== undefined),
      column: result.move.column,
      isStake: !!result.move.isStake
    };

    return move;
  }

  /**
   * Add a route to get an AI move
   */
  public static addAIMoveRoute(router: any) {
    router.post('/games/:gameId/ai-move', async (req: any, res: any) => {
      try {
        const { gameId } = req.params;
        const { difficulty, searchDepth } = req.body;

        // Find the game
        const gameModel = require('../../models/Game').GameModel;
        const game = await gameModel.findById(gameId);

        if (!game) {
          return res.status(404).json({ error: 'Game not found' });
        }

        // Calculate AI move
        const difficultyLevel = difficulty ? AIDifficulty[difficulty.toUpperCase() as keyof typeof AIDifficulty] : AIDifficulty.MEDIUM;
        const move = AIService.calculateMove(game, difficultyLevel, searchDepth || 4);

        if (!move) {
          return res.status(400).json({ error: 'Could not calculate AI move' });
        }

        // Apply the move
        const gameService = require('../gameService').GameService;
        const updatedGameState = gameService.makeMove(game, move);

        // Save the updated game
        game.set(updatedGameState);
        await game.save();

        // Return the move and updated game
        res.json({
          move,
          game: game.toObject()
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(500).json({ error: errorMessage });
      }
    });
  }
}
