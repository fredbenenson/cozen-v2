import { AIDifficulty, AIMove } from '../../ai/aiTypes';
import { Round } from '../../types/round';
import { Player } from '../../types/player';

export class AIService {
  /**
   * Calculate an AI move for a game
   * @deprecated Use boardgame.io's MCTS bot instead
   */
  public static calculateMove(
    round: Round,
    player: Player,
    difficulty: AIDifficulty = AIDifficulty.MEDIUM,
    searchDepth: number = 4
  ): AIMove | null {
    console.warn('AIService.calculateMove is deprecated. Use boardgame.io MCTS bot instead.');
    return null;
  }

  /**
   * Add a route to get an AI move
   * @deprecated Use boardgame.io's MCTS bot instead
   */
  public static addAIMoveRoute(router: any) {
    router.post('/games/:gameId/ai-move', async (req: any, res: any) => {
      try {
        res.status(501).json({ 
          error: 'This API endpoint is deprecated. MCTS AI is now integrated directly in the client.' 
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(500).json({ error: errorMessage });
      }
    });
  }
}