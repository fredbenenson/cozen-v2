// src/services/roundService.ts

import { Player } from '../types/player';
import { Round, Position, Move, RoundState } from '../types/round';
import { Card, Color } from '../types/game';
import { CozenEvaluation } from './cozenEvaluation';

export class RoundService {
  static readonly MAX_CARDS_PER_HAND = 5;
  static readonly MAX_STAKE_COUNT = 5;

  static initializeRound(
    redPlayer: Player,
    blackPlayer: Player,
    firstRound: boolean,
    activePlayer?: Player,
    inactivePlayer?: Player,
    previousStakes?: { red: Card[]; black: Card[] }
  ): Round {
    const round: Round = {
      redPlayer,
      blackPlayer,
      activePlayer: activePlayer || blackPlayer,
      inactivePlayer: inactivePlayer || redPlayer,
      firstRound,
      board: this.createBoard(),
      columns: [],
      state: 'running',
      turn: 1,
      cardsJailed: 0,
      victoryPointScores: { red: 0, black: 0 },
      firstStakes: { red: [], black: [] }
    };

    this.setupPositions(round);
    this.extractColumns(round);

    if (previousStakes) {
      round.firstStakes = previousStakes;
      this.processFirstStakes(round);
    } else {
      this.setupStakes(round);
    }

    return round;
  }

  private static createBoard(): Position[][] {
    return Array.from({ length: this.MAX_CARDS_PER_HAND * 2 + 1 }, () =>
      Array.from({ length: this.MAX_STAKE_COUNT * 2 }, () => ({} as Position))
    );
  }

  private static setupPositions(round: Round): void {
    let i = 0;
    round.board = round.board.map((row, m) =>
      row.map((position, n) => {
        position.n = i++;
        position.coord = [m, n];
        position.owner = m < this.MAX_CARDS_PER_HAND ||
          (m === this.MAX_CARDS_PER_HAND && n < this.MAX_STAKE_COUNT)
          ? round.blackPlayer
          : round.redPlayer;
        return position;
      })
    );
  }

  private static extractColumns(round: Round): void {
    round.columns = Array.from({ length: this.MAX_STAKE_COUNT * 2 }, (_, colIndex) => ({
      positions: round.board.map(row => row[colIndex]),
      stakedCard: undefined
    }));
  }

  static makeMove(round: Round, move: Move): void {
    if (move.didStake) {
      this.handleStakeMove(round, move);
    } else {
      this.handleWagerMove(round, move);
    }

    this.checkIfRoundOver(round);
    this.updateActivePlayer(round);
  }

  private static handleStakeMove(round: Round, move: Move): void {
    const card = round.activePlayer.hand.find(c => c.id === move.cards[0]);
    if (card) {
      card.played = true;
      this.stakeCard(round.activePlayer, card, round);
      round.activePlayer.drawUp();
    }
  }

  private static handleWagerMove(round: Round, move: Move): void {
    const cards = move.cards
      .map(cardId => round.activePlayer.hand.find(c => c.id === cardId))
      .filter((card): card is Card => card !== undefined);

    cards.forEach(card => {
      card.played = true;
    });

    round.activePlayer.hand = round.activePlayer.hand.filter(
      card => !cards.includes(card)
    );

    this.placeWageredCards(move.column, cards, round.activePlayer, round);
  }

  private static stakeCard(player: Player, card: Card, round: Round): void {
    const stakeColumn = player.availableStakes.shift();
    if (stakeColumn !== undefined) {
      round.board[this.MAX_CARDS_PER_HAND][stakeColumn].card = card;
      round.columns[stakeColumn].stakedCard = card;
    }
  }

  private static placeWageredCards(
    column: number,
    cards: Card[],
    player: Player,
    round: Round
  ): void {
    const positions = round.columns[column].positions
      .filter(pos => pos.owner === player && !pos.card)
      .sort((a, b) => (a.n - b.n) * (player.color === Color.Red ? 1 : -1));

    cards.forEach((card, index) => {
      if (positions[index]) {
        const pos = positions[index];
        round.board[pos.coord[0]][pos.coord[1]].card = card;
      }
    });
  }

  private static checkIfRoundOver(round: Round): void {
    if (round.activePlayer.hand.length === 0 && round.state === 'last_play') {
      this.endRound(round);
    }
    if (round.inactivePlayer.hand.length === 0 && round.state !== 'complete') {
      round.state = 'last_play';
    }
  }

  private static updateActivePlayer(round: Round): void {
    const temp = round.activePlayer;
    round.activePlayer = round.inactivePlayer;
    round.inactivePlayer = temp;
  }

  private static endRound(round: Round): void {
    this.scoreBoard(round);
    round.state = 'complete';
  }

  private static scoreBoard(round: Round): void {
    round.columns.forEach((column, i) => {
      if (this.isColumnContested(column.positions)) {
        const result = this.resolveContestedColumn(column.positions, round);
        if (result) {
          this.applyColumnResult(result, column.positions, round);
        }
      }
    });
  }

  private static isColumnContested(positions: Position[]): boolean {
    const hasRed = positions.some(pos => pos.card?.color === Color.Red);
    const hasBlack = positions.some(pos => pos.card?.color === Color.Black);
    return hasRed && hasBlack;
  }

  private static resolveContestedColumn(positions: Position[], round: Round) {
    const redCards = positions
      .filter(pos => pos.card?.color === Color.Red)
      .map(pos => pos.card!)
      .filter(card => positions[this.MAX_CARDS_PER_HAND].card !== card);

    const blackCards = positions
      .filter(pos => pos.card?.color === Color.Black)
      .map(pos => pos.card!)
      .filter(card => positions[this.MAX_CARDS_PER_HAND].card !== card);

    const stakeCard = positions[this.MAX_CARDS_PER_HAND].card;
    if (!stakeCard) return null;

    return CozenEvaluation.getWinningHand(
      redCards.map(c => c.number),
      blackCards.map(c => c.number),
      stakeCard.number,
      stakeCard.color === Color.Red
    );
  }

  private static applyColumnResult(
    result: ReturnType<typeof CozenEvaluation.getWinningHand>,
    positions: Position[],
    round: Round
  ): void {
    if (!result) return;

    const winner = result.hand1Wins ? round.redPlayer : round.blackPlayer;
    const loser = result.hand1Wins ? round.blackPlayer : round.redPlayer;

    const cardsToJail = positions
      .filter(pos => pos.card && pos.owner === loser)
      .map(pos => pos.card!);

    if (result.stakeGoesToJail) {
      const stake = positions[this.MAX_CARDS_PER_HAND].card;
      if (stake) cardsToJail.push(stake);
    }

    this.moveCardsToJail(cardsToJail, winner, round);
  }

  private static moveCardsToJail(cards: Card[], winner: Player, round: Round): void {
    cards.forEach(card => {
      if (card.color !== winner.color && card.victoryPoints) {
        round.victoryPointScores[winner.color] += card.victoryPoints;
        winner.jail.push(card);
        round.cardsJailed++;
      }
    });
  }

  // Additional methods for stakes setup...
  private static setupStakes(round: Round): void {
    this.getFirstStakesAndDrawUp(round, 'red');
    this.getFirstStakesAndDrawUp(round, 'black');
    this.processFirstStakes(round);
  }

  private static getFirstStakesAndDrawUp(round: Round, color: 'red' | 'black'): void {
    const player = color === 'red' ? round.redPlayer : round.blackPlayer;
    const firstCard = player.hand.shift();
    if (firstCard) {
      round.firstStakes[color].push(firstCard);
      player.drawUp();
    }
  }

  private static processFirstStakes(round: Round): void {
    round.firstStakes.red.forEach(card => this.stakeCard(round.redPlayer, card, round));
    round.firstStakes.black.forEach(card => this.stakeCard(round.blackPlayer, card, round));
  }
}
