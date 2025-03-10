import { Card, Rank, Suit } from '../types/game';

/**
 * Convert a card number to its display symbol
 */
export function getCardRankSymbol(cardNumber: number): string {
  if (cardNumber === 1) return 'A';
  if (cardNumber === 11) return 'J';
  if (cardNumber === 12) return 'Q';
  if (cardNumber === 13) return 'K';
  return cardNumber.toString();
}

/**
 * Get the suit symbol for a card
 */
export function getCardSuitSymbol(suit: Suit): string {
  switch (suit) {
    case Suit.Hearts:
      return '♥';
    case Suit.Diamonds:
      return '♦';
    case Suit.Clubs:
      return '♣';
    case Suit.Spades:
      return '♠';
    default:
      return '';
  }
}

/**
 * Get the display value for a card
 */
export function getCardDisplayValue(card: Card): string {
  return getCardRankSymbol(card.number) + getCardSuitSymbol(card.suit);
}