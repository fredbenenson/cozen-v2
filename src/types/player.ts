import { Card, Color } from './game';

export interface Player {
  color: Color;
  name: string;
  hand: Card[];
  jail: Card[];
  cards: Card[];
  victory_points: number;
  availableStakes: number[];
  stake_offset: number;
  drawUp: () => void;
  reset: (options: { newDeck: boolean; shuffled: boolean }) => void;
  id?: string;
}
