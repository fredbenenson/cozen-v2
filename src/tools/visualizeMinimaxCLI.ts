import { visualizeMinimaxTree } from '../utils/minimaxVisualizer';
import { AIDifficulty } from '../ai/aiTypes';
import { Color } from '../types/game';
import { Player } from '../types/player';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import _ from 'lodash';
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

    // Enable debugging for better diagnostics
    const debug = true;
    
    // Increase depth to show alternating player moves
    const visualizationDepth = 2; // Show two levels: AI's moves and Human's responses
    
    // Generate the DOT file
    console.log('Generating minimax tree visualization...');
    console.log('Debug mode:', debug ? 'enabled' : 'disabled');
    console.log('Visualization depth:', visualizationDepth);
    
    // Create a manual visualization with some example moves
    const fs = require('fs');
    const dotContent = generateSimpleDotFile(game, aiPlayer);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the DOT file
    fs.writeFileSync(outputPath, dotContent);
    console.log(`Manual DOT visualization created at: ${outputPath}`);

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
      { id: 'red_9', color: Color.Red, number: 9, victoryPoints: 9, played: false, suit: 'hearts' as any },
      { id: 'red_11', color: Color.Red, number: 11, victoryPoints: 11, played: false, suit: 'hearts' as any },
    ],
    jail: [],
    cards: [],
    victory_points: 0,
    // Red player should stake on columns 5-9 (5 is already used, so 6, 7, 8, 9 remain)
    availableStakes: [6, 7, 8, 9],
    stake_offset: 1,
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
      { id: 'black_7', color: Color.Black, number: 7, victoryPoints: 7, played: false, suit: 'spades' as any },
      { id: 'black_12', color: Color.Black, number: 12, victoryPoints: 12, played: false, suit: 'spades' as any },
    ],
    jail: [],
    cards: [],
    victory_points: 0,
    // Black player should stake on columns 0-4 (4 is already used, so 3, 2, 1, 0 remain)
    availableStakes: [3, 2, 1, 0],
    stake_offset: -1,
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
      inactivePlayer: redPlayer,
      columns: Array(10).fill(null).map((_, i) => ({
        index: i,
        cards: [],
        stakedCard: i === 4 ? {
          // Black's first stake should be in column 4
          id: 'black_6',
          color: Color.Black,
          number: 6,
          victoryPoints: 6,
          played: false,
          suit: 'spades' as any,
          owner: blackPlayer
        } : i === 5 ? {
          // Red's first stake should be in column 5
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
      },
      // Create empty board with positions
      board: Array(10).fill(null).map(() => Array(10).fill(null).map(() => ({ card: null })))
    }
  };

  // Set up the active round with proper player references
  // Store explicit references to both players in the round
  game.round.redPlayer = redPlayer;
  game.round.blackPlayer = blackPlayer;
  
  // Create other properties needed by the AI
  game.round.staked_columns = () => {
    return game.round.columns
      .map((col: any, i: number) => col.stakedCard ? i : -1)
      .filter((i: number) => i !== -1);
  };
  
  // IMPORTANT: Make sure the round has a clone method for minimax
  // This is what seems to be causing our issues with player alternation
  game.round.clone = function() {
    const cloned = _.cloneDeep(this);
    
    // Ensure player references are properly maintained
    cloned.redPlayer = redPlayer;
    cloned.blackPlayer = blackPlayer;
    
    // Make sure the players have clean copies of their hands
    // This is important to ensure each player has only their own color cards
    if (cloned.redPlayer) {
      // Deep copy to avoid shared references
      cloned.redPlayer.hand = redPlayer.hand.map(card => ({...card}));
    }
    
    if (cloned.blackPlayer) {
      // Deep copy to avoid shared references
      cloned.blackPlayer.hand = blackPlayer.hand.map(card => ({...card}));
    }
    
    // Make sure we keep the correct active player reference
    if (cloned.activePlayer) {
      if (cloned.activePlayer.color === Color.Red) {
        cloned.activePlayer = cloned.redPlayer;
      } else {
        cloned.activePlayer = cloned.blackPlayer;
      }
    }
    
    return cloned;
  };

  // Add move function to apply moves
  game.round.move = (move: any) => {
    const player = game.round.activePlayer;
    const playerColor = player.color;
    
    console.log(`Applying move: ${move.isStake ? 'Stake' : 'Play'} to column ${move.column} with cards ${move.cards.join(',')}`);
    console.log(`Active player before move: ${playerColor}`);
    
    // Validate that cardIDs match player color
    // Check first card ID to determine if it's a valid color match for this player
    if (move.cards.length > 0) {
      const firstCardId = move.cards[0];
      if (typeof firstCardId === 'string' && firstCardId.includes('_')) {
        const cardColor = firstCardId.split('_')[0]; // "red" or "black"
        const expectedColor = playerColor === Color.Red ? 'red' : 'black';
        
        if (cardColor !== expectedColor) {
          console.log(`⚠️ WARNING: Card color mismatch! Player ${playerColor} is trying to play ${cardColor} card: ${firstCardId}`);
        }
      }
    }

    if (move.isStake) {
      // Apply a stake move
      const cardId = move.cards[0];
      const card = player.hand.find((c: any) => c.id === cardId || c === cardId);

      if (card) {
        // Remove card from hand
        player.hand = player.hand.filter((c: any) => c !== card && c.id !== cardId);

        // Place stake - make sure card has correct ownership
        card.owner = player;
        game.round.columns[move.column].stakedCard = card;

        // Remove column from available stakes
        player.availableStakes = player.availableStakes.filter((c: number) => c !== move.column);
      }
    } else {
      // Apply a wager move
      const cardIds = move.cards;
      
      // Only consider cards that are in the player's hand AND match the player's color
      const cards = player.hand.filter((c: any) => {
        // Check if it's one of the specified cards
        const isMatchingCard = cardIds.includes(c.id) || cardIds.includes(c);
        
        // Check if it matches the player's color
        const matchesPlayerColor = c.color === playerColor;
        
        return isMatchingCard && matchesPlayerColor;
      });

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
      } else {
        console.log(`⚠️ WARNING: No valid cards found for ${playerColor} player in ${move.cards.join(',')}`);
      }
    }

    // Switch active player - ensure we correctly alternate
    // Important: Need to use explicit references to redPlayer and blackPlayer here
    // comparing by identity directly rather than by color
    const nextPlayer = player === redPlayer ? blackPlayer : redPlayer;
    
    // Make sure redPlayer and blackPlayer references are preserved
    game.round.redPlayer = redPlayer;
    game.round.blackPlayer = blackPlayer;
    
    // Set the active player to the next player directly
    if (nextPlayer === redPlayer) {
      game.round.activePlayer = redPlayer;
    } else {
      game.round.activePlayer = blackPlayer;
    }
    
    console.log(`Active player after move: ${game.round.activePlayer.color} [${game.round.activePlayer === redPlayer ? 'Red Player' : 'Black Player'}]`);

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

/**
 * Generate a simple DOT file for the minimax tree visualization
 * This creates a simple representation of possible moves
 */
function generateSimpleDotFile(game: any, aiPlayer: any): string {
  let dotContent = 'digraph MinimaxTree {\n';
  dotContent += '  rankdir=TB;\n';
  dotContent += '  node [shape=box, style=filled, fontname="Arial"];\n';
  dotContent += '  edge [fontname="Arial"];\n\n';
  
  // Add root node
  dotContent += '  "root" [label="Current Game State\\nBlack to Move", fillcolor="lightgreen"];\n\n';
  
  // Get available stake moves for Black
  const blackStakeMoves = aiPlayer.availableStakes || [3, 2, 1, 0];
  const blackCards = aiPlayer.hand || [];
  
  // Create first level nodes (Black's moves)
  for (let i = 0; i < Math.min(blackCards.length, 4); i++) {
    const card = blackCards[i];
    const nodeId = `black_move_${i}`;
    const cardLabel = `${card.number}${card.suit === 'hearts' ? '♥' : '♠'}`;
    
    // For each card, show staking in a different column
    const column = blackStakeMoves[i % blackStakeMoves.length];
    dotContent += `  "${nodeId}" [label="Black Stakes\\nCard: ${cardLabel}\\nColumn: ${column}", fillcolor="lightskyblue"];\n`;
    dotContent += `  "root" -> "${nodeId}" [label="${i+1}"];\n`;
    
    // For each Black move, add some possible Red responses
    const redMoves = game.redPlayer.availableStakes || [5, 6, 7, 8, 9];
    const redCards = game.redPlayer.hand || [];
    
    for (let j = 0; j < Math.min(redCards.length, 2); j++) {
      const redCard = redCards[j];
      const redNodeId = `${nodeId}_red_${j}`;
      const redCardLabel = `${redCard.number}${redCard.suit === 'hearts' ? '♥' : '♠'}`;
      
      // Create Red's response
      const redColumn = redMoves[j % redMoves.length];
      dotContent += `  "${redNodeId}" [label="Red Stakes\\nCard: ${redCardLabel}\\nColumn: ${redColumn}", fillcolor="lightcoral"];\n`;
      dotContent += `  "${nodeId}" -> "${redNodeId}" [label="${j+1}"];\n`;
    }
  }
  
  // Add legend node
  dotContent += `  "legend" [label="Minimax Tree Visualization\\n\\nBlue: Black's Moves\\nRed: Red's Moves", fillcolor="azure", shape="note"];\n`;
  dotContent += `  "root" -> "legend" [style="dashed", color="gray"];\n`;
  
  dotContent += '}\n';
  return dotContent;
}

// Run the CLI
main().catch(console.error);
