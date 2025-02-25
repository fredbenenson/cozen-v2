import { GameService } from './services/gameService';
import { DeckService } from './services/deckService';
import { Color, Card, Move, Suit, BaseGameState } from './types/game';
import { UserModel, IUser } from './models/User';
import readline from 'readline';
import { Types } from 'mongoose';
import { Round } from './types/round';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function createTestPlayer(username: string, color: Color): IUser {
  return new UserModel({
    _id: new Types.ObjectId(),
    username,
    color,
    elo: 1200,
    hand: [],
    jail: [],
    currentGames: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

async function setupGame() {
  // Create test players
  const player1 = createTestPlayer('player1', Color.Red);
  const player2 = createTestPlayer('player2', Color.Black);

  // Create initial decks for each player
  const redDeck = DeckService.createDeck(Color.Red);
  const blackDeck = DeckService.createDeck(Color.Black);

  // Deal initial hands
  player1.hand = redDeck.slice(0, 5);
  player2.hand = blackDeck.slice(0, 5);

  // Initialize game
  const gameState = GameService.initializeGame(player1, player2) as BaseGameState;

  // Safety check if round is defined
  if (!gameState.round) {
    throw new Error("Game round failed to initialize");
  }

  // Make sure the round's active/inactive players have hands
  gameState.round.activePlayer.hand = player1.hand;
  gameState.round.inactivePlayer.hand = player2.hand;

  // Add remaining decks to game state
  gameState.decks = {
    [Color.Red]: redDeck.slice(5),
    [Color.Black]: blackDeck.slice(5)
  };

  console.log('\nGame initialized!');
  console.log('\nCurrent board state:');
  printGameState(gameState);

  return { gameState, player1, player2 };
}

function createCard(input: string, color: Color): Card {
  // Allow both R_2 and 2 formats
  const numberStr = input.includes('_') ? input.split('_')[1] : input;
  const number = parseInt(numberStr);

  // Determine suit based on color
  const suit = color === Color.Red ?
    (Math.random() < 0.5 ? Suit.Hearts : Suit.Diamonds) :
    (Math.random() < 0.5 ? Suit.Clubs : Suit.Spades);

  return {
    id: `${color}_${number}_${suit}`,
    color,
    suit,
    number,
    victoryPoints: DeckService.calculateVictoryPoints(number, suit),
    played: false
  };
}

function printCard(card: Card, showId: boolean = false): string {
  const suitSymbol = card.suit === Suit.Hearts ? '♥'
    : card.suit === Suit.Diamonds ? '♦'
    : card.suit === Suit.Clubs ? '♣'
    : '♠';

  const numberStr = card.number === 11 ? 'J'
    : card.number === 12 ? 'Q'
    : card.number === 13 ? 'K'
    : card.number === 14 ? 'A'
    : card.number.toString();

  const display = `${numberStr}${suitSymbol}`;
  return showId ? `${display}(${card.id})` : display;
}

function printGameState(gameState: BaseGameState) {
  const width = 80;
  const separator = '='.repeat(width);

  console.log('\n' + separator);
  console.log('GAME STATE'.padStart(width/2 + 5).padEnd(width));
  console.log(separator);

  // Safety check if round is defined
  if (!gameState.round) {
    console.log("No active round to display");
    return;
  }

  const round = gameState.round;

  // Print black player's information
  const blackPlayer = round.activePlayer.color === Color.Black ?
    round.activePlayer : round.inactivePlayer;
  console.log('\nBLACK PLAYER:');
  console.log('Hand:', blackPlayer.hand.map(c => printCard(c, true)).join(' '));
  console.log('Jail:', blackPlayer.jail.map(c => printCard(c)).join(' ') || 'empty');
  console.log('Deck remaining:', gameState.decks?.[Color.Black].length);

  // Print board
  console.log('\nBOARD:');
  console.log('     ' + Array.from({length: 10}, (_, i) => i.toString().padStart(8)).join(''));
  console.log('     ' + '↓'.padStart(8).repeat(10));

  // Black's play area (top)
  for (let row = 0; row < 5; row++) {
    let rowStr = row.toString().padStart(2) + ' B: ';
    for (let col = 0; col < 10; col++) {
      const position = gameState.board[col]?.positions?.[row];
      rowStr += (position?.card ? printCard(position.card) : '·').padStart(8);
    }
    console.log(rowStr);
  }

  // Stakes row (middle)
  let stakeRow = ' S:   ';
  for (let col = 0; col < 10; col++) {
    const stake = gameState.board[col]?.stakedCard;
    stakeRow += (stake ? printCard(stake) : '·').padStart(8);
  }
  console.log(stakeRow);

  // Red's play area (bottom)
  for (let row = 6; row < 11; row++) {
    let rowStr = (row-6).toString().padStart(2) + ' R: ';
    for (let col = 0; col < 10; col++) {
      const position = gameState.board[col]?.positions?.[row];
      rowStr += (position?.card ? printCard(position.card) : '·').padStart(8);
    }
    console.log(rowStr);
  }

  // Print red player's information
  const redPlayer = round.activePlayer.color === Color.Red ?
    round.activePlayer : round.inactivePlayer;
  console.log('\nRED PLAYER:');
  console.log('Hand:', redPlayer.hand.map(c => printCard(c, true)).join(' '));
  console.log('Jail:', redPlayer.jail.map(c => printCard(c)).join(' ') || 'empty');
  console.log('Deck remaining:', gameState.decks?.[Color.Red].length);

  // Print current state
  console.log('\nCURRENT STATE:');
  console.log('Active player:', round.activePlayer.color.toUpperCase());
  console.log('Game status:', gameState.status);

  console.log(separator);
}

async function gameLoop() {
  try {
    const { gameState, player1, player2 } = await setupGame();

    const promptMove = () => {
      // Safety check if round is defined
      if (!gameState.round) {
        console.log("No active round available");
        rl.close();
        return;
      }

      const activeColor = gameState.round.activePlayer.color;

      console.log('\nAvailable moves:');
      console.log('stake <number> <column>  (e.g., "stake 5 2")');
      console.log('play <number>,<number> <column>  (e.g., "play 3,4 1")');
      console.log('quit');

      rl.question('\nEnter move: ', (input) => {
        if (input === 'quit') {
          rl.close();
          process.exit(0);
        }

        // Safety check if round is still defined (could have changed between prompts)
        if (!gameState.round) {
          console.log("No active round available");
          rl.close();
          return;
        }

        const [action, ...args] = input.split(' ');
        let move: Move;

        if (action === 'stake') {
          const card = createCard(args[0], activeColor);
          move = {
            playerId: gameState.round.activePlayer.id || "",
            cards: [card],
            column: parseInt(args[1]),
            isStake: true
          };
        } else if (action === 'play') {
          const [cards, column] = args;
          move = {
            playerId: gameState.round.activePlayer.id || "",
            cards: cards.split(',').map(id => createCard(id, activeColor)),
            column: parseInt(column),
            isStake: false
          };
        } else {
          console.log('Invalid move format');
          promptMove();
          return;
        }

        console.log('Making move:', move);
        const updatedState = GameService.makeMove(gameState, move) as BaseGameState;
        printGameState(updatedState);
        promptMove();
      });
    };

    promptMove();

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

gameLoop();
