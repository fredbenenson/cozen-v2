import { visualizeMinimaxTree } from '../utils/minimaxVisualizer';
import { AIDifficulty } from '../ai/aiTypes';
import { Color } from '../types/game';
import { Player } from '../types/player';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { printGameState } from '../utils/gameVisualizer';

// A simple CLI tool to generate a minimax tree visualization

async function main(): Promise<void> {
  console.log('Minimax Tree Visualizer');
  console.log('----------------------');

  // Get command line arguments or use defaults
  const args = process.argv.slice(2);
  const outputPath = args[0] || './tmp/minimax-tree.dot';
  const maxMoves = parseInt(args[1] || '8', 10);
  const maxDepth = parseInt(args[2] || '1', 10);

  // Create output directories if they don't exist
  const dotDir = path.dirname(outputPath);
  if (!fs.existsSync(dotDir)) {
    fs.mkdirSync(dotDir, { recursive: true });
  }

  // Create visualizations directory if it doesn't exist
  const visualizationsDir = path.join(process.cwd(), 'visualizations');
  if (!fs.existsSync(visualizationsDir)) {
    fs.mkdirSync(visualizationsDir, { recursive: true });
  }

  // Define PDF output path
  const pdfOutputPath = path.join(visualizationsDir, 'minimax-tree.pdf');

  console.log(`DOT file path: ${outputPath}`);
  console.log(`PDF output path: ${pdfOutputPath}`);
  console.log(`Max moves per node: ${maxMoves}`);
  console.log(`Max depth to show: ${maxDepth}`);

  try {
    // Create a sample game state for visualization
    const { game, aiPlayer } = createSampleGameState();

    // Print the game state using the full visualization
    console.log('\nSample game state for visualization:');

    // Extract player information to improve visualization
    const blackPlayer = aiPlayer || game.blackPlayer;
    const redPlayer = game.redPlayer;

    if (blackPlayer && redPlayer) {
      // Add player names to help visualization
      if (!blackPlayer.name) blackPlayer.name = "AI Player";
      if (!redPlayer.name) redPlayer.name = "Human Player";

      // Use unified game state visualization
      // clearScreen=false to avoid disrupting the terminal
      printGameState(game, false, false);
    } else {
      console.log("[Game state cannot be visualized - missing player information]");
    }

    // Generate the DOT file
    console.log('Generating minimax tree visualization...');
    visualizeMinimaxTree(game, aiPlayer, outputPath, maxMoves, maxDepth);

    // Generate PDF from DOT file
    console.log('Converting DOT file to PDF...');

    try {
      // Check if Graphviz is installed
      execSync('dot -V', { stdio: 'ignore' });

      // Generate PDF
      execSync(`dot -Tpdf "${outputPath}" -o "${pdfOutputPath}"`, {
        stdio: 'inherit',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large trees
      });

      console.log(`\nVisualization complete! PDF saved to: ${pdfOutputPath}`);

      // Open the PDF
      try {
        switch (process.platform) {
          case 'darwin': // macOS
            execSync(`open "${pdfOutputPath}"`);
            break;
          case 'win32': // Windows
            execSync(`start "" "${pdfOutputPath}"`);
            break;
          case 'linux': // Linux
            execSync(`xdg-open "${pdfOutputPath}"`);
            break;
          default:
            console.log(`Please open the file manually: ${pdfOutputPath}`);
        }

        console.log('Visualization opened in default PDF viewer.');
      } catch (openError) {
        console.log(`Unable to automatically open the file. Please open it manually: ${pdfOutputPath}`);
      }
    } catch (graphvizError) {
      console.error('Error: Graphviz not found or error generating PDF.');
      console.error('Please install Graphviz (https://graphviz.org/download/) and run:');
      console.error(`dot -Tpdf "${outputPath}" -o "${pdfOutputPath}"`);
    }
  } catch (error) {
    console.error('Error generating visualization:', error);
  }
}

/**
 * Create a sample game state for visualization
 */
function createSampleGameState(): { game: any, aiPlayer: any } {
  // Create a sample game state with two players and a round
  const redPlayer: Player = {
    id: 'player-red',
    name: 'Human Player',
    color: Color.Red,
    hand: [
      { id: 'red_10', color: Color.Red, number: 10, victoryPoints: 10, played: false, suit: 'hearts' as any },
      { id: 'red_5', color: Color.Red, number: 5, victoryPoints: 5, played: false, suit: 'hearts' as any },
      { id: 'black_7', color: Color.Black, number: 7, victoryPoints: 7, played: false, suit: 'spades' as any },
      { id: 'black_12', color: Color.Black, number: 12, victoryPoints: 12, played: false, suit: 'spades' as any },
    ],
    jail: [],
    cards: [],
    victory_points: 0,
    // Red player should stake on columns 5-9
    availableStakes: [6, 7, 8, 9],
    stake_offset: 5,
    drawUp: () => {},
    reset: () => {}
  };

  const blackPlayer: Player = {
    id: 'player-black',
    name: 'AI Player',
    color: Color.Black,
    hand: [
      { id: 'black_8', color: Color.Black, number: 8, victoryPoints: 8, played: false, suit: 'spades' as any },
      { id: 'black_3', color: Color.Black, number: 3, victoryPoints: 3, played: false, suit: 'spades' as any },
      { id: 'red_9', color: Color.Red, number: 9, victoryPoints: 9, played: false, suit: 'hearts' as any },
      { id: 'red_11', color: Color.Red, number: 11, victoryPoints: 11, played: false, suit: 'hearts' as any },
    ],
    jail: [],
    cards: [],
    victory_points: 0,
    // Black player should stake on columns 0-4
    availableStakes: [0, 1, 3, 4],
    stake_offset: 0,
    drawUp: () => {},
    reset: () => {}
  };

  // Create a sample game with columns
  const game: any = {
    key: 'sample-game',
    redPlayer,
    blackPlayer,
    round: {
      state: 'active',
      activePlayer: blackPlayer,
      columns: Array(10).fill(null).map((_, i) => ({
        index: i,
        cards: [],
        stakedCard: i === 4 ? {
          id: 'black_6',
          color: Color.Black,
          number: 6,
          victoryPoints: 6,
          played: false,
          suit: 'spades' as any,
          owner: blackPlayer
        } : i === 5 ? {
          id: 'red_8',
          color: Color.Red,
          number: 8,
          victoryPoints: 8,
          played: false,
          suit: 'hearts' as any,
          owner: redPlayer
        } : null
      })),
      victory_point_scores: {
        red: 0,
        black: 0
      }
    }
  };

  // Set up the active round
  game.round.staked_columns = () => {
    return game.round.columns
      .map((col: any, i: number) => col.stakedCard ? i : -1)
      .filter((i: number) => i !== -1);
  };

  // Add move function to apply moves
  game.round.move = (move: any) => {
    const player = game.round.activePlayer;

    if (move.isStake) {
      // Apply a stake move
      const cardId = move.cards[0];
      const card = player.hand.find((c: any) => c.id === cardId || c === cardId);

      if (card) {
        // Remove card from hand
        player.hand = player.hand.filter((c: any) => c !== card && c.id !== cardId);

        // Place stake
        game.round.columns[move.column].stakedCard = card;

        // Remove column from available stakes
        player.availableStakes = player.availableStakes.filter((c: number) => c !== move.column);
      }
    } else {
      // Apply a wager move
      const cardIds = move.cards;
      const cards = player.hand.filter((c: any) =>
        cardIds.includes(c.id) || cardIds.includes(c)
      );

      if (cards.length > 0) {
        // Remove cards from hand
        player.hand = player.hand.filter((c: any) =>
          !cardIds.includes(c.id) && !cardIds.includes(c)
        );

        // Add cards to column
        const column = game.round.columns[move.column];
        if (!column.cards) {
          column.cards = [];
        }
        column.cards = column.cards.concat(cards);
      }
    }

    // Switch active player
    game.round.activePlayer = player === redPlayer ? blackPlayer : redPlayer;

    // End round if both players are out of cards
    if (redPlayer.hand.length === 0 && blackPlayer.hand.length === 0) {
      game.round.state = 'complete';
    }
  };

  // Add score_board function
  game.round.score_board = () => {
    // Simple scoring logic - just count card victory points per column
    let redScore = 0;
    let blackScore = 0;

    game.round.columns.forEach((column: any) => {
      if (!column.cards) return;

      // Count cards by color
      const redCards = column.cards.filter((c: any) => c.color === Color.Red);
      const blackCards = column.cards.filter((c: any) => c.color === Color.Black);

      // Calculate victory points
      redCards.forEach((c: any) => redScore += (c.victoryPoints || 0));
      blackCards.forEach((c: any) => blackScore += (c.victoryPoints || 0));

      // Add staked card points to owner
      if (column.stakedCard) {
        const stakedCard = column.stakedCard;
        if (stakedCard.owner && stakedCard.owner.color === Color.Red) {
          redScore += (stakedCard.victoryPoints || 0);
        } else if (stakedCard.owner && stakedCard.owner.color === Color.Black) {
          blackScore += (stakedCard.victoryPoints || 0);
        }
      }
    });

    game.round.victory_point_scores = { red: redScore, black: blackScore };
  };

  return { game, aiPlayer: blackPlayer };
}

// Run the CLI
main().catch(console.error);
