import { CozenAI, AIDifficulty } from '../ai/cozenAI';
import { Color, Suit } from '../types/game';
import { Player } from '../types/player';
import { Position, Round } from '../types/round';
import { MoveOption } from '../ai/aiTypes';
import { AIMoveGenerator } from '../ai/aiMoveGenerator';
import { AIEvaluation } from '../ai/aiEvaluation';
import fs from 'fs';
import path from 'path';
import _ from 'lodash';

/**
 * This script generates a detailed visualization of the minimax search tree.
 * Instead of monkey patching, it directly implements a minimax search with visualization.
 *
 * Usage:
 *   npm run script -- ./src/scripts/improvedMinimaxVisualizer.ts [searchDepth] [outputFile]
 */

// Parse command line arguments
const searchDepth = process.argv[2] ? parseInt(process.argv[2]) : 3;
const outputFile = process.argv[3] || 'minimax-tree-improved';

// Create a timestamp-based output directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join('visualizations', `improved-search-${timestamp}`);

console.log(`Creating improved minimax visualization with depth ${searchDepth}`);
console.log(`Output will be saved to ${outputDir}/${outputFile}.dot`);

// Create directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper function to create a mock player
function createMockPlayer(color: Color): Player {
  const availableStakes = color === Color.Red ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];

  // Create cards for testing - more variety for better visualization
  const hand = [];

  if (color === Color.Red) {
    // Red player has interesting strategic options
    hand.push(
      { id: `${color}_3_${Suit.Hearts}`, color, suit: Suit.Hearts, number: 3, victoryPoints: 3, played: false },
      { id: `${color}_4_${Suit.Hearts}`, color, suit: Suit.Hearts, number: 4, victoryPoints: 4, played: false },
      { id: `${color}_5_${Suit.Hearts}`, color, suit: Suit.Hearts, number: 5, victoryPoints: 5, played: false },
      { id: `${color}_7_${Suit.Hearts}`, color, suit: Suit.Hearts, number: 7, victoryPoints: 7, played: false },
      { id: `${color}_7_${Suit.Diamonds}`, color, suit: Suit.Diamonds, number: 7, victoryPoints: 7, played: false }
    );
  } else {
    // Black player has good competing options
    hand.push(
      { id: `${color}_5_${Suit.Spades}`, color, suit: Suit.Spades, number: 5, victoryPoints: 5, played: false },
      { id: `${color}_6_${Suit.Spades}`, color, suit: Suit.Spades, number: 6, victoryPoints: 6, played: false },
      { id: `${color}_8_${Suit.Spades}`, color, suit: Suit.Spades, number: 8, victoryPoints: 8, played: false },
      { id: `${color}_8_${Suit.Clubs}`, color, suit: Suit.Clubs, number: 8, victoryPoints: 8, played: false },
      { id: `${color}_10_${Suit.Spades}`, color, suit: Suit.Spades, number: 10, victoryPoints: 10, played: false }
    );
  }

  return {
    color,
    name: `player-${color}`,
    hand,
    jail: [],
    cards: [],
    victory_points: 0,
    availableStakes,
    stake_offset: color === Color.Red ? 1 : -1,
    drawUp: () => {},
    reset: () => {}
  };
}

// Create mock position helper function
function createMockPosition(owner: Player, n: number, column: number, row: number): Position {
  return {
    owner,
    n,
    coord: [row, column],
    card: undefined
  };
}

// Set up game state
const redPlayer = createMockPlayer(Color.Red);
const blackPlayer = createMockPlayer(Color.Black);

// Add cards to jails for mid-game state
blackPlayer.jail = [
  { id: `${Color.Red}_4_${Suit.Hearts}`, color: Color.Red, suit: Suit.Hearts, number: 4, victoryPoints: 4, played: false },
  { id: `${Color.Red}_5_${Suit.Diamonds}`, color: Color.Red, suit: Suit.Diamonds, number: 5, victoryPoints: 5, played: false }
];

redPlayer.jail = [
  { id: `${Color.Black}_3_${Suit.Spades}`, color: Color.Black, suit: Suit.Spades, number: 3, victoryPoints: 3, played: false },
  { id: `${Color.Black}_10_${Suit.Clubs}`, color: Color.Black, suit: Suit.Clubs, number: 10, victoryPoints: 10, played: false }
];

// Set victory points from jail cards
blackPlayer.victory_points = blackPlayer.jail.reduce((sum, card) => sum + card.victoryPoints, 0);
redPlayer.victory_points = redPlayer.jail.reduce((sum, card) => sum + card.victoryPoints, 0);

// Create and configure a game board with multiple columns and positions
function createGameBoard() {
  // Setup multiple columns with staked cards for more interesting decisions
  const columns = [];

  // Column 0: Red stake of 9
  const col0BlackPositions = [];
  for (let i = 0; i < 5; i++) {
    col0BlackPositions.push(createMockPosition(blackPlayer, i, 0, i));
  }

  const col0RedPositions = [];
  for (let i = 6; i < 11; i++) {
    col0RedPositions.push(createMockPosition(redPlayer, i, 0, i));
  }

  columns.push({
    positions: [...col0BlackPositions, ...col0RedPositions],
    stakedCard: {
      id: `${Color.Red}_9_${Suit.Hearts}`,
      color: Color.Red,
      suit: Suit.Hearts,
      number: 9,
      victoryPoints: 9,
      played: false
    }
  });

  // Column 1: Black stake of 7
  const col1BlackPositions = [];
  for (let i = 0; i < 5; i++) {
    col1BlackPositions.push(createMockPosition(blackPlayer, i, 1, i));
  }

  const col1RedPositions = [];
  for (let i = 6; i < 11; i++) {
    col1RedPositions.push(createMockPosition(redPlayer, i, 1, i));
  }

  columns.push({
    positions: [...col1BlackPositions, ...col1RedPositions],
    stakedCard: {
      id: `${Color.Black}_7_${Suit.Spades}`,
      color: Color.Black,
      suit: Suit.Spades,
      number: 7,
      victoryPoints: 7,
      played: false
    }
  });

  return columns;
}

// Create a mock round
const mockRound: any = {
  redPlayer,
  blackPlayer,
  activePlayer: blackPlayer,  // Black player is active
  inactivePlayer: redPlayer,
  firstRound: false,
  board: [],
  columns: createGameBoard(),
  state: 'running',
  turn: 5,  // Mid-game
  cardsJailed: 4,
  name: 'root',
  victoryPointScores: {
    red: redPlayer.victory_points,
    black: blackPlayer.victory_points
  },
  firstStakes: { red: [], black: [] }
};

// Graph node structure for visualization
interface GraphNode {
  id: string;
  parentId: string | null;
  depth: number;
  score: number;
  move: MoveOption | null;
  maximizing: boolean;
  pruned: boolean;
  alpha: number;
  beta: number;
}

// Custom minimax implementation that captures the full tree
class MinimaxVisualizer {
  private nodes: GraphNode[] = [];
  private nodeCounter = 0;
  private playerColor: Color;
  private maxDepth: number;

  constructor(playerColor: Color, maxDepth: number) {
    this.playerColor = playerColor;
    this.maxDepth = maxDepth;
  }

  public search(round: any): { bestMove: MoveOption | null, bestScore: number } {
    // Reset state
    this.nodes = [];
    this.nodeCounter = 0;

    // Create root node
    const rootNodeId = 'root';
    this.nodes.push({
      id: rootNodeId,
      parentId: null,
      depth: 0,
      score: 0,
      move: null,
      maximizing: true,
      pruned: false,
      alpha: -Infinity,
      beta: Infinity
    });

    // Start minimax search
    const score = this.minimax(
      _.cloneDeep(round),
      this.maxDepth,
      true,
      -Infinity,
      Infinity,
      rootNodeId
    );

    // Find the best move (child of root with highest score for maximizing player)
    const rootChildren = this.nodes.filter(node => node.parentId === rootNodeId);
    let bestMove = null;
    let bestScore = -Infinity;

    rootChildren.forEach(child => {
      if (child.score > bestScore && child.move) {
        bestScore = child.score;
        bestMove = child.move;
      }
    });

    return { bestMove, bestScore };
  }

  private minimax(
    round: any,
    depth: number,
    maximizing: boolean,
    alpha: number,
    beta: number,
    parentNodeId: string
  ): number {
    // Terminal check
    if (depth === 0 || round.state === 'complete') {
      const score = AIEvaluation.evaluateState(round, this.playerColor);
      const nodeId = `node_${this.nodeCounter++}`;

      this.nodes.push({
        id: nodeId,
        parentId: parentNodeId,
        depth: this.maxDepth - depth,
        score,
        move: null,
        maximizing,
        pruned: false,
        alpha,
        beta
      });

      return score;
    }

    // Generate possible moves
    const possibleMoves = AIMoveGenerator.generatePossibleMoves(round);

    if (possibleMoves.length === 0) {
      // No moves available
      const score = AIEvaluation.evaluateState(round, this.playerColor);
      const nodeId = `node_${this.nodeCounter++}`;

      this.nodes.push({
        id: nodeId,
        parentId: parentNodeId,
        depth: this.maxDepth - depth,
        score,
        move: null,
        maximizing,
        pruned: false,
        alpha,
        beta
      });

      return score;
    }

    if (maximizing) {
      let bestScore = -Infinity;

      for (const move of possibleMoves) {
        // Create child round
        const childRound = _.cloneDeep(round);
        childRound.name = `node_${this.nodeCounter}`;

        // Apply move
        AIEvaluation.applyMove(childRound, move);

        // Create node ID
        const nodeId = `node_${this.nodeCounter++}`;

        // Recursive minimax
        const score = this.minimax(childRound, depth - 1, !maximizing, alpha, beta, nodeId);

        // Update best score
        bestScore = Math.max(bestScore, score);

        // Create graph node
        const pruned = bestScore >= beta;
        this.nodes.push({
          id: nodeId,
          parentId: parentNodeId,
          depth: this.maxDepth - depth,
          score,
          move,
          maximizing,
          pruned,
          alpha,
          beta
        });

        // Alpha-beta pruning
        if (bestScore >= beta) {
          break;
        }

        alpha = Math.max(alpha, bestScore);
      }

      return bestScore;
    } else {
      let bestScore = Infinity;

      for (const move of possibleMoves) {
        // Create child round
        const childRound = _.cloneDeep(round);
        childRound.name = `node_${this.nodeCounter}`;

        // Apply move
        AIEvaluation.applyMove(childRound, move);

        // Create node ID
        const nodeId = `node_${this.nodeCounter++}`;

        // Recursive minimax
        const score = this.minimax(childRound, depth - 1, !maximizing, alpha, beta, nodeId);

        // Update best score
        bestScore = Math.min(bestScore, score);

        // Create graph node
        const pruned = bestScore <= alpha;
        this.nodes.push({
          id: nodeId,
          parentId: parentNodeId,
          depth: this.maxDepth - depth,
          score,
          move,
          maximizing,
          pruned,
          alpha,
          beta
        });

        // Alpha-beta pruning
        if (bestScore <= alpha) {
          break;
        }

        beta = Math.min(beta, bestScore);
      }

      return bestScore;
    }
  }

  public generateDotFile(outputPath: string): string {
    if (this.nodes.length === 0) {
      console.warn('No nodes to visualize');
      return '';
    }

    let dotContent = 'digraph MinimaxTree {\n';
    dotContent += '  rankdir=TB;\n';
    dotContent += '  node [shape=box, style="filled", fontname="Arial"];\n\n';

    // Add nodes
    for (const node of this.nodes) {
      // Create node label
      let label = `${node.id}\\nDepth: ${node.depth}\\nScore: ${node.score.toFixed(2)}`;

      // Add move info if available
      if (node.move) {
        const moveType = node.move.isStake ? 'Stake' : 'Wager';
        const cardsInfo = Array.isArray(node.move.cards) ? node.move.cards.join('|') : '';
        label += `\\n${moveType} to Col ${node.move.column}`;
        if (cardsInfo) {
          label += `\\nCards: ${cardsInfo}`;
        }
      }

      // Determine node color
      let fillColor = '#FFFFFF';
      if (node.maximizing) {
        fillColor = node.pruned ? '#FADBD8' : '#D6EAF8'; // Light red if pruned, light blue otherwise
      } else {
        fillColor = node.pruned ? '#FADBD8' : '#F5EEF8'; // Light red if pruned, light purple otherwise
      }

      dotContent += `  "${node.id}" [label="${label}", fillcolor="${fillColor}"];\n`;
    }

    // Add edges
    for (const node of this.nodes) {
      if (node.parentId !== null) {
        // Edge style based on pruning
        const edgeStyle = node.pruned ? 'dashed' : 'solid';
        const edgeColor = node.pruned ? 'red' : 'black';

        // Edge label based on alpha/beta values
        const edgeLabel = node.maximizing ?
          `β:${node.beta === Infinity ? '∞' : node.beta}` :
          `α:${node.alpha === -Infinity ? '-∞' : node.alpha}`;

        dotContent += `  "${node.parentId}" -> "${node.id}" [label="${edgeLabel}", style=${edgeStyle}, color=${edgeColor}];\n`;
      }
    }

    // Group nodes by depth for better layout
    const depthGroups = _.groupBy(this.nodes, 'depth');
    for (const [depth, nodes] of Object.entries(depthGroups)) {
      if (nodes.length > 1) {
        dotContent += `  { rank=same; `;
        nodes.forEach(node => {
          dotContent += `"${node.id}" `;
        });
        dotContent += `}\n`;
      }
    }

    dotContent += '}\n';

    // Write to file
    fs.writeFileSync(outputPath, dotContent);
    console.log(`Generated DOT file: ${outputPath}`);

    return outputPath;
  }

  public getStats() {
    if (this.nodes.length === 0) {
      return {
        totalNodes: 0,
        maxDepth: 0,
        prunedNodes: 0,
        pruningEfficiency: '0%',
        nodesByDepth: {}
      };
    }

    const totalNodes = this.nodes.length;
    const maxDepth = Math.max(...this.nodes.map(n => n.depth));
    const prunedNodes = this.nodes.filter(n => n.pruned).length;
    const pruningEfficiency = prunedNodes > 0 ?
      ((prunedNodes / totalNodes) * 100).toFixed(2) + '%' : '0%';
    const nodesByDepth = _.countBy(this.nodes, 'depth');

    return {
      totalNodes,
      maxDepth,
      prunedNodes,
      pruningEfficiency,
      nodesByDepth
    };
  }
}

// Create game state
const mockGame = { round: mockRound };

// Track time
const startTime = Date.now();

// Run custom visualization
console.log(`Starting custom minimax visualization with depth ${searchDepth}...`);
const visualizer = new MinimaxVisualizer(Color.Black, searchDepth);
const result = visualizer.search(mockRound);
const endTime = Date.now();

// Generate DOT file
const dotFile = path.join(outputDir, `${outputFile}.dot`);
visualizer.generateDotFile(dotFile);

// Get stats
const stats = visualizer.getStats();

// Display results
console.log(`\nSearch completed in ${endTime - startTime}ms`);
console.log(`Best move:`, result.bestMove ?
  `${result.bestMove.isStake ? 'Stake' : 'Wager'} to column ${result.bestMove.column}` :
  'No move found');
console.log(`Best score: ${result.bestScore}`);

console.log('\nSearch Statistics:');
console.log(`- Total nodes examined: ${stats.totalNodes}`);
console.log(`- Maximum depth reached: ${stats.maxDepth}`);
console.log(`- Pruned nodes: ${stats.prunedNodes} (${stats.pruningEfficiency})`);

console.log('\nNodes by depth:');
Object.entries(stats.nodesByDepth).forEach(([depth, count]) => {
  console.log(`- Depth ${depth}: ${count} nodes`);
});

// Create comparison with original AI implementation
console.log('\nComparing with CozenAI implementation...');
const ai = new CozenAI(mockGame, blackPlayer, AIDifficulty.MEDIUM, searchDepth);
ai.enableDebug();

const aiStartTime = Date.now();
const aiResult = ai.calculateMoveWithStats();
const aiEndTime = Date.now();

console.log(`CozenAI search completed in ${aiEndTime - aiStartTime}ms`);
console.log(`Selected move:`, aiResult.move ?
  `${aiResult.move.isStake ? 'Stake' : 'Wager'} to column ${aiResult.move.column}` :
  'No move selected');
console.log(`Nodes evaluated: ${aiResult.searchResult.nodeCount}`);

// Write summary
const summaryFile = path.join(outputDir, 'summary.txt');
const summaryContent = `
Minimax Search Visualization Summary
====================================
Date: ${new Date().toISOString()}
Search Depth: ${searchDepth}

Game Configuration:
- Red player hand: ${redPlayer.hand.map(c => `${c.number}${c.suit.charAt(0)}`).join(', ')}
- Black player hand: ${blackPlayer.hand.map(c => `${c.number}${c.suit.charAt(0)}`).join(', ')}
- Columns: ${mockRound.columns?.length}
- Red points: ${redPlayer.victory_points}
- Black points: ${blackPlayer.victory_points}

Custom Visualizer Results:
- Total nodes: ${stats.totalNodes}
- Pruned nodes: ${stats.prunedNodes} (${stats.pruningEfficiency})
- Max depth: ${stats.maxDepth}
- Execution time: ${endTime - startTime}ms
- Best score: ${result.bestScore}
- Best move: ${result.bestMove ?
  `${result.bestMove.isStake ? 'Stake' : 'Wager'} to column ${result.bestMove.column}` :
  'No move found'}

CozenAI Results:
- Nodes evaluated: ${aiResult.searchResult.nodeCount}
- Execution time: ${aiEndTime - aiStartTime}ms
- Selected move: ${aiResult.move ?
  `${aiResult.move.isStake ? 'Stake' : 'Wager'} to column ${aiResult.move.column}` :
  'No move selected'}

To visualize the graph:
dot -Tpng -o ${outputFile}.png ${dotFile}
`;

fs.writeFileSync(summaryFile, summaryContent);

console.log(`\nSummary saved to: ${summaryFile}`);
console.log(`DOT file saved to: ${dotFile}`);
console.log(`\nTo visualize the graph, use Graphviz:`);
console.log(`dot -Tpng -o ${outputFile}.png ${dotFile}`);
console.log(`Or online at https://dreampuf.github.io/GraphvizOnline/`);
