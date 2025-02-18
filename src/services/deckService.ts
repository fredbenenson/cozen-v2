// src/services/deckService.ts
import { Card, Color, Suit } from '../types/game';

export class DeckService {
  static createDeck(color: Color): Card[] {
    const suits = color === Color.Red ? [Suit.Hearts, Suit.Diamonds] : [Suit.Clubs, Suit.Spades];
    const deck: Card[] = [];
    
    suits.forEach(suit => {
      // Card numbers from 2 to 14 (Ace)
      for (let number = 2; number <= 14; number++) {
        const card: Card = {
          id: `${color}_${number}_${suit}`,
          color,
          suit,
          number,
          victoryPoints: this.calculateVictoryPoints(number, suit),
          played: false
        };
        deck.push(card);
      }
    });

    return this.shuffleDeck(deck);
  }

  static shuffleDeck(deck: Card[]): Card[] {
    return deck.sort(() => Math.random() - 0.5);
  }

  static calculateVictoryPoints(number: number, suit: Suit): number {
    // Special rules for victory points
    if (number >= 11) {
      // Face cards
      if ((suit === Suit.Spades || suit === Suit.Hearts) && number === 13) {
        return 70; // Poison King
      }
      return 10; // Other face cards
    }
    return number; // Number cards are worth their face value
  }
}

// src/services/gameService.ts
import { GameState, Player, Card, Color } from '../types/game';
import { DeckService } from './deckService';

export class GameService {
  static initializeGame(player1: Player, player2: Player): GameState {
    // Create decks for each player
    const redDeck = DeckService.createDeck(Color.Red);
    const blackDeck = DeckService.createDeck(Color.Black);

    // Initialize game state
    return {
      id: this.generateGameId(),
      players: [player1, player2],
      currentPlayerIndex: Math.random() < 0.5 ? 0 : 1,
      board: this.createInitialBoard(),
      round: {
        activePlayer: player1,
        inactivePlayer: player2,
        turn: 1,
        state: 'running'
      },
      status: 'waiting'
    };
  }

  private static generateGameId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private static createInitialBoard() {
    // Create an empty board with predefined columns
    return Array(10).fill(null).map(() => ({
      positions: [],
      stakedCard: undefined
    }));
  }

  static makeMove(game: GameState, move: any): GameState {
    // Implement move logic
    // This will be complex and depend on the specific rules of Cozen
    
    // Basic move progression
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 2;
    
    // Check for round or game end
    if (this.checkRoundEnd(game)) {
      game.round.state = 'complete';
      
      if (this.checkGameEnd(game)) {
        game.status = 'complete';
      }
    }

    return game;
  }

  static checkRoundEnd(game: GameState): boolean {
    // Implement round end conditions
    // For example, if a player has no cards left or certain victory points are reached
    return false;
  }

  static checkGameEnd(game: GameState): boolean {
    // Implement game end conditions
    return false;
  }

  static evaluateHand(hand: Card[], stakedCard: Card): number {
    // Implement hand evaluation logic from the original game
    // This involves checking for pairs, runs, and special card interactions
    return 0;
  }
}