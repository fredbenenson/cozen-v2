import fs from 'fs';
import path from 'path';
import { CozenAI, AIDifficulty } from '../ai/cozenAI';
import { Color, Suit } from '../types/game';
import { Player } from '../types/player';
import { Round } from '../types/round';
import { GameNode } from '../ai/aiTypes';
import _ from 'lodash';

/**
 * MinimaxVisualizer - Generates DOT files to visualize minimax search trees
 */
class MinimaxVisualizer {
  private readonly debugNodes: GameNode[] = [];
  private totalNodesGenerated = 0;
  private ai: CozenAI;
  private outputPath: string;

  /**
   * Create a MinimaxVisualizer instance
   *
   * @param ai Initialized CozenAI instance to trace
   * @param outputPath Directory where to save output files
   */
  constructor(ai: CozenAI, outputPath: string = './visualizations') {
    this.ai = ai;
    this.outputPath = outputPath;

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Monkey patch the AI's minimax writeNode method to capture nodes
    this.monkeyPatchAI();
  }

  /**
   * Monkey patch the AI's minimax implementation to capture node data
   */
  private monkeyPatchAI() {
    // We need a direct reference to the Minimax class
    const Minimax = require('../ai/minimax').Minimax;

    // Store the original minimax method from Minimax's prototype
    const originalMinimax = Minimax.prototype.minimax;

    // Reference to the visualizer for use in the patch
    const self = this;

    // Replace Minimax's minimax method with our capturing version
    Minimax.prototype.minimax = function(round: any, depth: number, maximizing: boolean,
                                      alpha: number, beta: number, maxDepth: number) {
      // Capture the node before calling the original method

      // First generate a unique name for this node
      const nodeName = round.name || 'root';
      if (!round.name) {
        round.name = 'root';
      }

      // Only call original method
      const score = originalMinimax.call(this, round, depth, maximizing, alpha, beta, maxDepth);

      // Don't do anything else on the callback (nodes are captured in writeNode)
      return score;
    };

    // Also patch the writeNode method
    const originalWriteNode = Minimax.prototype.writeNode;

    // Replace writeNode to capture node data
    Minimax.prototype.writeNode = function(round: any, depth: number, child: any,
                                      move: any, maximizing: boolean,
                                      alpha: number, beta: number,
                                      beatAlphaBeta: boolean) {
      // Call original method first if it exists
      if (originalWriteNode) {
        originalWriteNode.call(this, round, depth, child, move, maximizing, alpha, beta, beatAlphaBeta);
      }

      // Ensure child has a name
      if (!child.name) {
        child.name = `${round.name || 'root'}-${self.totalNodesGenerated}`;
      }

      // Fix the depth to be positive
      const adjustedDepth = Math.abs(depth);

      // Then capture the node for visualization
      const node: GameNode = {
        source: round.name || 'root',
        target: child.name,
        n: self.totalNodesGenerated++,
        depth: adjustedDepth, // Use absolute value since depths are negative in your implementation
        score: child.score !== undefined ? child.score : 0,
        childState: child.state || 'unknown',
        alphaBeta: maximizing ? `β:${beta}` : `α:${alpha}`,
        beatAlphaBeta,
        maximizing,
        cards: Array.isArray(move.cards) ? move.cards.join('|') : '',
        column: move.column || 0,
        isStake: move.isStake || false
      };

      self.debugNodes.push(node);
    };
  }

  /**
   * Generate a DOT file from the captured minimax search nodes
   *
   * @param filename Name for the output file
   * @returns Path to the generated DOT file
   */
  public generateDotFile(filename: string = 'minimax-tree'): string {
    if (this.debugNodes.length === 0) {
      console.warn('No nodes captured. Run a calculation first.');
      return '';
    }

    const outputFile = path.join(this.outputPath, `${filename}.dot`);
    const nodeMap = new Map<string, string>();

    // Start DOT file
    let dotContent = 'digraph MinimaxTree {\n';
    dotContent += '  rankdir=TB;\n';
    dotContent += '  node [shape=box, style="filled", fontname="Arial"];\n\n';

    // Fix for root node if missing
    const hasRoot = this.debugNodes.some(n => n.source === 'root' && n.target !== 'root');
    if (!hasRoot && this.debugNodes.length > 0) {
      const rootId = this.sanitizeNodeId('root');
      dotContent += `  ${rootId} [label="root\\nDepth: 0", fillcolor="#D6EAF8"];\n`;
      nodeMap.set(rootId, 'root');
    }

    // Add nodes
    this.debugNodes.forEach(node => {
      const sourceId = this.sanitizeNodeId(node.source);
      const targetId = this.sanitizeNodeId(node.target);

      // Create source node if it doesn't exist
      if (!nodeMap.has(sourceId)) {
        const sourceColor = node.maximizing ? '#D6EAF8' : '#F5EEF8';
        const sourceLabel = `${node.source}\\nDepth: ${node.depth}`;
        dotContent += `  ${sourceId} [label="${sourceLabel}", fillcolor="${sourceColor}"];\n`;
        nodeMap.set(sourceId, node.source);
      }

      // Create target node
      if (!nodeMap.has(targetId)) {
        // Choose color based on maximizing/minimizing and pruning
        let fillColor = node.maximizing ? '#D6EAF8' : '#F5EEF8'; // Light blue for maximizing, light purple for minimizing
        if (node.beatAlphaBeta) {
          fillColor = '#FADBD8'; // Light red for pruned nodes
        }

        // Format cards for display
        const cardsDisplay = node.cards ? `\\nCards: ${node.cards}` : '';
        const moveType = node.isStake ? 'Stake' : 'Wager';

        const label = `${node.target}\\nDepth: ${node.depth}\\nScore: ${node.score.toFixed(2)}\\n` +
                     `${moveType} to Col ${node.column}${cardsDisplay}`;

        dotContent += `  ${targetId} [label="${label}", fillcolor="${fillColor}"];\n`;
        nodeMap.set(targetId, node.target);
      }

      // Create edge from source to target
      let edgeStyle = node.beatAlphaBeta ? 'dashed' : 'solid';
      let edgeColor = node.beatAlphaBeta ? 'red' : 'black';
      let edgeLabel = node.alphaBeta;

      dotContent += `  ${sourceId} -> ${targetId} [label="${edgeLabel}", style=${edgeStyle}, color=${edgeColor}];\n`;
    });

    // Group nodes by depth
    const depthGroups = _.groupBy(this.debugNodes, 'depth');

    // Add invisible edges between nodes at the same depth to improve layout
    Object.entries(depthGroups).forEach(([depth, nodes]) => {
      if (nodes.length > 1) {
        dotContent += `  { rank=same; `;
        nodes.forEach(node => {
          dotContent += `${this.sanitizeNodeId(node.target)} `;
        });
        dotContent += `}\n`;
      }
    });

    // End DOT file
    dotContent += '}\n';

    // Write to file
    fs.writeFileSync(outputFile, dotContent);
    console.log(`DOT file generated: ${outputFile}`);

    return outputFile;
  }

  /**
   * Clean up node IDs to be valid in DOT syntax
   */
  private sanitizeNodeId(id: string): string {
    return `node_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  /**
   * Get statistics about the captured minimax tree
   */
  public getStats(): any {
    if (this.debugNodes.length === 0) {
      return { nodes: 0, maxDepth: 0, nodesByDepth: {} };
    }

    const maxDepth = Math.max(...this.debugNodes.map(n => n.depth));
    const prunedNodes = this.debugNodes.filter(n => n.beatAlphaBeta).length;
    const maxNodes = this.debugNodes.length;
    const depthStats = _.countBy(this.debugNodes, 'depth');

    return {
      nodes: maxNodes,
      prunedNodes,
      pruningEfficiency: prunedNodes > 0 ? ((prunedNodes / maxNodes) * 100).toFixed(2) + '%' : '0%',
      maxDepth,
      nodesByDepth: depthStats
    };
  }
}

// Command-line interface
if (require.main === module) {
  // Simple function to create a mock player for testing
  function createMockPlayer(color: Color): Player {
    const availableStakes = color === Color.Red ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];
    return {
      color,
      name: `player-${color}`,
      hand: [{ id: `${color}_5_${Suit.Hearts}`, color, suit: Suit.Hearts, number: 5, victoryPoints: 5, played: false }],
      jail: [],
      cards: [],
      victory_points: 0,
      availableStakes,
      stake_offset: color === Color.Red ? 1 : -1,
      drawUp: () => {},
      reset: () => {}
    };
  }

  // Create test players
  const redPlayer = createMockPlayer(Color.Red);
  const blackPlayer = createMockPlayer(Color.Black);

  // Create a mock round
  const mockRound: Partial<Round> = {
    redPlayer,
    blackPlayer,
    activePlayer: blackPlayer,
    inactivePlayer: redPlayer,
    firstRound: true,
    board: [],
    columns: [
      {
        positions: [],
        stakedCard: { id: `${Color.Red}_7_${Suit.Hearts}`, color: Color.Red, suit: Suit.Hearts, number: 7, victoryPoints: 7, played: false }
      }
    ],
    state: 'running',
    turn: 1,
    cardsJailed: 0,
    victoryPointScores: { red: 0, black: 0 },
    firstStakes: { red: [], black: [] }
  };

  // Create a simple game state
  const mockGame = { round: mockRound };

  // Initialize AI with debug mode enabled
  const ai = new CozenAI(mockGame, blackPlayer, AIDifficulty.MEDIUM, 3);
  ai.enableDebug();

  // Initialize visualizer
  const visualizer = new MinimaxVisualizer(ai, './visualizations');

  console.log('Calculating move and generating visualization...');

  // Run the calculation
  const result = ai.calculateMoveWithStats();

  // Generate DOT file
  const dotFile = visualizer.generateDotFile('minimax-example');

  // Print stats
  console.log('Search complete. Stats:', visualizer.getStats());
  console.log(`Generated DOT file: ${dotFile}`);
  console.log(`To view the graph, use a tool like Graphviz: dot -Tpng -o minimax-tree.png ${dotFile}`);
}

export default MinimaxVisualizer;
