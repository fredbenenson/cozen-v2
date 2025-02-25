// src/factories/PlayerFactory.ts
import mongoose from 'mongoose'; // Add this import
import { IUser } from '../models/User';
import { Player } from '../types/player';
import { Color } from '../types/game';
import { DeckService } from '../services/deckService';

export class PlayerFactory {
  /**
   * Create a game Player from a database User
   */
  static createFromUser(user: IUser | Partial<IUser>, color: Color): Player {
    // Create a new Player
    const player: Player = {
      id: user._id ? user._id.toString() : new mongoose.Types.ObjectId().toString(),
      name: user.username || `Player-${color}`,
      color,
      hand: [],
      jail: [],
      cards: [],
      victory_points: 0,
      availableStakes: color === Color.Red ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4],
      stake_offset: color === Color.Red ? 1 : -1,

      // Implement these methods properly
      drawUp: function() {
        const maxHandSize = 5;
        if (this.hand.length < maxHandSize && this.cards.length > 0) {
          while (this.hand.length < maxHandSize && this.cards.length > 0) {
            const card = this.cards.shift();
            if (card) this.hand.push(card);
          }
        }
      },

      reset: function(options: { newDeck: boolean; shuffled: boolean }) {
        if (options.newDeck) {
          const newDeck = DeckService.createDeck(this.color);
          this.cards = [...newDeck];
        }

        if (options.shuffled) {
          this.cards = DeckService.shuffleDeck(this.cards);
        }

        this.cards.forEach(card => card.played = false);

        // Draw a new hand
        this.hand = this.cards.splice(0, 5);

        // Reset available stakes
        this.availableStakes = this.color === Color.Red
          ? [5, 6, 7, 8, 9]
          : [0, 1, 2, 3, 4];
      }
    };

    return player;
  }

  /**
   * Create a player for mock testing
   */
  static createMockPlayer(color: Color, name: string = `Player-${color}`): Player {
    // Create a minimal mock user object with just the required properties
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      username: name,
      color,
    };

    // Create a player from this minimal user object
    return this.createFromUser(mockUser, color);
  }
}
