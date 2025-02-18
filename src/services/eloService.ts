export class EloService {
  static calculateRating(
    playerRating: number, 
    opponentRating: number, 
    playerScore: number
  ): number {
    const k = 32; // K-factor
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    return playerRating + k * (playerScore - expectedScore);
  }
}