import { CozenAI, AIDifficulty, AIMove } from '../../ai/cozenAI';
import { Round } from '../../types/round';
import { Player } from '../../types/player';

export class AIService {
  /**
   * Calculate an AI move for a game
   */
  public static calculateMove(
    round: Round,
    player: Player,
    difficulty: AIDifficulty = AIDifficulty.MEDIUM,
    searchDepth: number = 4
  ): AIMove | null {
    // Create a new AI instance
    const ai = new CozenAI(player, difficulty, searchDepth);
    
    // Calculate and return the move
    return ai.calculateMove(round);
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

        // Get the current round
        const round = game.getCurrentRound();
        
        // Get the AI player (active player)
        const aiPlayer = round.activePlayer;

        // Calculate AI move
        const difficultyLevel = difficulty ? AIDifficulty[difficulty.toUpperCase() as keyof typeof AIDifficulty] : AIDifficulty.MEDIUM;
        const move = AIService.calculateMove(round, aiPlayer, difficultyLevel, searchDepth || 4);

        if (!move) {
          return res.status(400).json({ error: 'Could not calculate AI move' });
        }

        // Set player name and game ID for the move
        move.playerName = aiPlayer.name;
        move.gameId = gameId;

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