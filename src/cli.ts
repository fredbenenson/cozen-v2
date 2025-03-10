import { GameService } from './services/gameService';
import { DeckService } from './services/deckService';
import { Color, Card, Move, Suit, BaseGameState } from './types/game';
import { UserModel, IUser } from './models/User';
import readline from 'readline';
import { Types } from 'mongoose';
import { Round } from './types/round';
import { CozenAI, AIDifficulty } from './ai/cozenAI';
import { Player } from './types/player';
import { 
  printGameState, 
  findCardByNumber,
  printCard
} from './utils/gameVisualizer';

// Create an interface that supports command history and improved input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
  prompt: '> '
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

async function setupGame(useAI: boolean = false, aiColor: Color = Color.Black, difficulty: AIDifficulty = AIDifficulty.MEDIUM) {
  // Create test players
  const player1 = createTestPlayer(useAI && aiColor === Color.Red ? 'AI' : 'player1', Color.Red);
  const player2 = createTestPlayer(useAI && aiColor === Color.Black ? 'AI' : 'player2', Color.Black);

  // Initialize game - this will create and shuffle decks for each player
  const gameState = GameService.initializeGame(player1, player2) as BaseGameState;

  // Safety check if round is defined
  if (!gameState.round) {
    throw new Error("Game round failed to initialize");
  }

  // Add decks reference to game state for easier access in CLI
  gameState.decks = {
    [Color.Red]: gameState.round.redPlayer.cards || [],
    [Color.Black]: gameState.round.blackPlayer.cards || []
  };

  // Set up AI if requested
  let ai: CozenAI | null = null;

  if (useAI) {
    // Need to get the player as Player type, not IUser
    const aiPlayer = aiColor === Color.Red ?
      (gameState.round?.redPlayer as Player) :
      (gameState.round?.blackPlayer as Player);

    if (aiPlayer) {
      ai = new CozenAI(aiPlayer, difficulty);
      console.log(`\nGame initialized with AI (${aiColor}) at ${difficulty} difficulty!`);
    }
  } else {
    console.log('\nGame initialized for two human players!');
  }

  console.log('\nCurrent board state:');
  printGameState(gameState, true); // true = show commands

  return { gameState, player1, player2, ai };
}


// Function to get available AI move
function getAIMove(gameState: BaseGameState, ai: CozenAI): Promise<Move | null> {
  return new Promise((resolve) => {
    // Calculate AI move
    console.log("AI is thinking...");

    // Safety check for null round
    if (!gameState.round) {
      console.log("No active round for AI to use");
      resolve(null);
      return;
    }

    const aiMoveResult = ai.calculateMoveWithStats(gameState.round);

    if (!aiMoveResult.move) {
      console.log("AI couldn't determine a valid move");
      resolve(null);
      return;
    }

    const aiMove = aiMoveResult.move;
    const aiMoves = aiMoveResult.candidateMoves || [];

    // Ensure column is defined
    if (aiMove.column === undefined) {
      console.log("AI move has undefined column");
      resolve(null);
      return;
    }

    // Display top 10 moves (or fewer if less available)
    console.log("\n=== AI's Top Moves ===");
    const topMoves = Array.isArray(aiMoves) ? aiMoves.slice(0, 10) : [];
    
    topMoves.forEach((moveOption, index) => {
      const isSelectedMove = moveOption === aiMove;
      const prefix = isSelectedMove ? "→ " : "  ";
      
      // Extract card numbers from card IDs
      const cardIds = moveOption.cards.map(id => {
        if (typeof id !== 'string') return 'unknown';
        
        // Parse the card ID format (color_number_suit or just number)
        const parts = id.split('_');
        return parts.length > 1 ? parts[1] : id;
      }).join(',');
      
      // Make sure score exists and is a number before formatting
      const scoreDisplay = moveOption.score !== undefined ? 
        moveOption.score.toFixed(2) : 
        'N/A';
      
      console.log(`${prefix}${index + 1}. ${moveOption.isStake ? 'Stake' : 'Play'} ${cardIds} to column ${moveOption.column} (Score: ${scoreDisplay})`);
    });

    console.log(`\nAI will ${aiMove.isStake ? 'stake' : 'play'} to column ${aiMove.column} with ${aiMove.cards.length} cards`);
    console.log("Press Enter to continue...");

    // Wait for user input before continuing
    rl.question('', () => {
      const moveToReturn = {
        playerId: gameState.round!.activePlayer.id || "",
        cards: aiMove.cards.map(cardId => {
          // Try to find the card in the player's hand
          const card = gameState.round!.activePlayer.hand.find(c => c.id === cardId);
          // If found, return it; otherwise create a new card from ID
          if (card) return card;

          // Parse the card ID format (color_number_suit)
          const [colorStr, numberStr, suitStr] = cardId.split('_');
          return {
            id: cardId,
            color: colorStr as Color,
            number: parseInt(numberStr),
            suit: suitStr as Suit,
            victoryPoints: 0, // Will be calculated by service
            played: false
          };
        }),
        column: aiMove.column,
        isStake: aiMove.isStake
      };
      
      resolve(moveToReturn);
    });
  });
}

// Function to show help
function showHelp() {
  console.log('\n== COZEN GAME COMMANDS ==');
  console.log('stake <card_number> <column>    Stake a card in a column');
  console.log('play <number>,<number> <column> Play cards to a column');
  console.log('hand                           Show your current hand');
  console.log('board                          Show the game board');
  console.log('help                           Show this help');
  console.log('quit                           Exit the game');
  console.log('\nEXAMPLES:');
  console.log('stake 7 2  - Stake the 7 card in column 2');
  console.log('play 3,4 0 - Play the 3 and 4 cards to column 0');
}

// Setup game with configurable options
async function setupGameWithOptions() {
  console.log('\n== COZEN CARD GAME ==');
  console.log('Welcome to Cozen! Choose your game mode:');
  console.log('1. Human vs Human');
  console.log('2. Human vs AI (you play as Red)');
  console.log('3. Human vs AI (you play as Black)');
  console.log('4. Quit');

  return new Promise<{ gameState: BaseGameState, player1: IUser, player2: IUser, ai: CozenAI | null }>((resolve, reject) => {
    rl.question('\nEnter your choice (1-4): ', async (choice) => {
      try {
        switch (choice) {
          case '1':
            resolve(await setupGame(false));
            break;
          case '2':
            resolve(await setupGame(true, Color.Black, AIDifficulty.MEDIUM));
            break;
          case '3':
            resolve(await setupGame(true, Color.Red, AIDifficulty.MEDIUM));
            break;
          case '4':
            console.log('Goodbye!');
            rl.close();
            process.exit(0);
          default:
            console.log('Invalid choice, please try again.');
            resolve(await setupGameWithOptions());
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function gameLoop() {
  try {
    // Ask player for game type
    const { gameState, player1, player2, ai } = await setupGameWithOptions();

    // Function to validate the move is legal
    const isValidMove = (move: Move): boolean => {
      // Ensure move has a defined column
      if (move.column === undefined) {
        console.log('Move has undefined column');
        return false;
      }

      // Check if the column is valid
      if (move.column < 0 || move.column > 9) {
        console.log('Invalid column number (must be 0-9)');
        return false;
      }

      // Ensure we have a round
      if (!gameState.round) {
        console.log('No active round available');
        return false;
      }

      // For stake moves, check if player has an available stake at that column
      if (move.isStake) {
        // Check if this is a valid column for this player based on color
        const playerColor = gameState.round.activePlayer.color;
        const validRange = playerColor === Color.Red ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];

        if (!validRange.includes(move.column)) {
          console.log(`Column ${move.column} is out of range for ${playerColor} player (valid: ${validRange.join(', ')})`);
          return false;
        }

        // Check if this column already has a staked card
        if (gameState.round.columns[move.column]?.stakedCard) {
          console.log(`Column ${move.column} already has a staked card`);
          return false;
        }

        // Now check if it's in the player's available stakes
        if (!gameState.round.activePlayer.availableStakes?.includes(move.column)) {
          console.log(`Column ${move.column} is not available for staking`);
          return false;
        }
      } else {
        // For play moves, check if there's a staked card in the column
        if (!gameState.round.columns[move.column]?.stakedCard) {
          console.log(`Column ${move.column} has no staked card`);
          return false;
        }
      }

      // Check if player has the specified cards in hand
      const validCards = move.cards.every(card => {
        // Check if playing valid card numbers
        const cardInHand = gameState.round!.activePlayer.hand.some(c =>
          c.number === card.number && c.color === gameState.round!.activePlayer.color
        );

        if (!cardInHand) {
          console.log(`You don't have a ${card.number} in your hand`);
        }
        return cardInHand;
      });

      return validCards;
    };

    const promptMove = () => {
      // Safety check if round is defined
      if (!gameState.round) {
        console.log("No active round available");
        rl.close();
        return;
      }

      const activeColor = gameState.round.activePlayer.color;

      // Check if it's AI's turn by comparing the active player's color with the AI's color
      const isAITurn = ai && ((ai as any).player?.color === activeColor);

      // If it's AI's turn, make the AI move
      if (isAITurn && ai) {
        getAIMove(gameState, ai).then(aiMove => {
          if (aiMove) {
            console.log(`AI is making a move: ${aiMove.isStake ? 'stake' : 'play'} to column ${aiMove.column}`);
            const updatedState = GameService.makeMove(gameState, aiMove) as BaseGameState;

            // Small pause before showing the updated state
            setTimeout(() => {
              printGameState(updatedState, true); // true = show commands

              // Check for game end
              if (updatedState.status === 'complete') {
                console.log('\nGame over!');
                const blackScore = updatedState.round?.blackPlayer.victory_points || 0;
                const redScore = updatedState.round?.redPlayer.victory_points || 0;

                if (blackScore > redScore) {
                  console.log('Black player wins!');
                } else if (redScore > blackScore) {
                  console.log('Red player wins!');
                } else {
                  console.log('The game is a tie!');
                }

                rl.question('\nPlay again? (y/n): ', (answer) => {
                  if (answer.toLowerCase() === 'y') {
                    gameLoop();
                  } else {
                    console.log('Thanks for playing!');
                    rl.close();
                    process.exit(0);
                  }
                });
              } else {
                promptMove();
              }
            }, 500);
          } else {
            console.log("AI couldn't make a valid move. Game might be in an invalid state.");
            rl.close();
          }
        });
        return;
      }

      // Show prompt for human player
      rl.question('> ', (input) => {
        input = input.trim().toLowerCase();

        // Handle special commands
        if (input === 'quit') {
          console.log('Thanks for playing!');
          rl.close();
          process.exit(0);
        } else if (input === 'help') {
          showHelp();
          promptMove();
          return;
        } else if (input === 'hand') {
          if (gameState.round) {
            // printCard is already imported at the top
            console.log('Your hand:',
              gameState.round.activePlayer.hand.map(c =>
                `${printCard(c, false)} (${c.number})`
              ).join(' ')
            );
          } else {
            console.log('No active round available');
          }
          promptMove();
          return;
        } else if (input === 'board') {
          printGameState(gameState, true); // true = show commands
          promptMove();
          return;
        }

        // Safety check if round is still defined
        if (!gameState.round) {
          console.log("No active round available");
          rl.close();
          return;
        }

        // Parse and execute move
        const [action, ...args] = input.split(' ');
        let move: Move | null = null;

        try {
          if (action === 'stake' && args.length >= 2) {
            // Find the specified card in player's hand
            const cardNumber = parseInt(args[0]);
            const column = parseInt(args[1]);

            // Find the actual card in the player's hand
            const cardInHand = findCardByNumber(gameState.round.activePlayer, cardNumber);

            if (!cardInHand) {
              console.log(`You don't have a ${cardNumber} in your hand`);
              promptMove();
              return;
            }

            // Create move
            move = {
              playerId: gameState.round.activePlayer.id || "",
              cards: [cardInHand], // Using the actual card object
              column,
              isStake: true
            };
          } else if (action === 'play' && args.length >= 2) {
            const [cardsStr, columnStr] = args;
            const column = parseInt(columnStr);
            const cardNumbers = cardsStr.split(',').map(n => parseInt(n));

            // Find the cards in player's hand
            const cardsToPlay = cardNumbers.map(num => {
              const card = findCardByNumber(gameState.round!.activePlayer, num);
              if (!card) {
                throw new Error(`Card ${num} not found in your hand`);
              }
              return card;
            });

            move = {
              playerId: gameState.round.activePlayer.id || "",
              cards: cardsToPlay,
              column,
              isStake: false
            };
          } else {
            console.log('Invalid move format. Type "help" for command syntax.');
            promptMove();
            return;
          }

          // Validate move
          if (move && isValidMove(move)) {
            const updatedState = GameService.makeMove(gameState, move) as BaseGameState;
            printGameState(updatedState, true); // true = show commands

            // Check for game end
            if (updatedState.status === 'complete') {
              console.log('\nGame over!');
              const blackScore = updatedState.round?.blackPlayer.victory_points || 0;
              const redScore = updatedState.round?.redPlayer.victory_points || 0;

              if (blackScore > redScore) {
                console.log('Black player wins!');
              } else if (redScore > blackScore) {
                console.log('Red player wins!');
              } else {
                console.log('The game is a tie!');
              }

              rl.question('\nPlay again? (y/n): ', (answer) => {
                if (answer.toLowerCase() === 'y') {
                  gameLoop();
                } else {
                  console.log('Thanks for playing!');
                  rl.close();
                  process.exit(0);
                }
              });
            } else {
              promptMove();
            }
          } else {
            promptMove();
          }
        } catch (error) {
          console.error('Error making move:', error);
          promptMove();
        }
      });
    };

    promptMove();

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

gameLoop();
