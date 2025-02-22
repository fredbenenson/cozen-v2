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
