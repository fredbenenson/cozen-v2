import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import { AIMove, GameNode, AIDifficulty } from '../ai/aiTypes';
import { CozenAI } from '../ai/cozenAI';
import { Round } from '../types/round';
import { Player } from '../types/player';
import { BaseGameState } from '../types/game';

/**
 * Class for visualizing the Minimax search tree
 */
export class MinimaxVisualizer {
  private nodes: GameNode[] = [];
  private maxMovesPerNode: number = 5;
  private maxDepthToShow: number = 1; // Only show first level of depth by default
  private outputPath: string;
  private gameState: any;
  private ai: CozenAI;

  /**
   * Create a new visualizer instance
   * @param game The game object
   * @param player The AI player
   * @param outputPath Path to save the DOT file
   * @param maxMovesPerNode Maximum number of moves to show per node (default: 10)
   */
  constructor(
    game: any,
    player: Player,
    outputPath: string = './tmp/minimax-tree.dot',
    maxMovesPerNode: number = 10,
    maxDepthToShow: number = 3
  ) {
    this.outputPath = outputPath;
    this.maxMovesPerNode = maxMovesPerNode;
    this.maxDepthToShow = maxDepthToShow;
    this.gameState = game;

    // Create an AI instance with debug enabled
    this.ai = new CozenAI(game, player, AIDifficulty.HARD, 3);
    this.ai.enableDebug();

    // Set up node tracking
    this.nodes = [];
  }

  /**
   * Generate the minimax tree visualization
   * @param currentRound The current game round
   */
  public generateTree(): void {
    // Store current state
    this.gameState = _.cloneDeep(this.gameState);
    const currentRound = this.gameState.round;

    // Hook into the minimax function to track nodes
    this.interceptMinimaxFunction();

    // Run the AI to calculate its move (this will populate our nodes)
    const result = this.ai.calculateMoveWithStats();

    // Generate the DOT file
    this.generateDotFile();

    console.log(`Minimax tree visualization generated with ${this.nodes.length} nodes`);
    console.log(`DOT file saved to: ${this.outputPath}`);
    console.log(`Use Graphviz to convert to image: dot -Tpdf ${this.outputPath} -o minimax-tree.pdf`);

    return;
  }

  /**
   * Intercept the minimax function to track nodes
   * This is a bit hacky, but allows us to visualize the search tree
   * We're only tracking the nodes, not modifying the algorithm itself
   */
  private interceptMinimaxFunction(): void {
    // Save reference to the original minimax function
    const originalMinimax = (this.ai as any).minimax;
    const self = this;

    // Override the minimax function to track nodes
    (this.ai as any).minimax = function(
      round: any,
      depth: number,
      maximizing: boolean,
      alpha: number,
      beta: number
    ): number {
      // Get the current state identifier
      const sourceId = round.name || 'root';

      // Generate moves
      const allMoves = (this as any).generateMoves(round);

      // Limit moves to the top N by score for visualization only
      const topMoves = _.chain(allMoves)
        .sortBy((m: any) => -(m.score || 0))
        .take(self.maxMovesPerNode)
        .value();

      // Create visualization nodes before calling the original minimax
      if (Math.abs(depth) <= self.maxDepthToShow) { // Only track nodes up to max depth
        for (let i = 0; i < topMoves.length; i++) {
          const move = topMoves[i];
          const childState = `${sourceId}_${i}`;

          // Create node for visualization (we'll update scores later)
          self.nodes.push({
            source: sourceId,
            target: childState,
            n: i,
            depth: Math.abs(depth),
            score: move.score || 0, // Initial score from evaluation
            childState,
            alphaBeta: `α:${alpha.toFixed(1)}, β:${beta.toFixed(1)}`,
            beatAlphaBeta: false,
            maximizing,
            cards: move.cards.join(','),
            column: move.column,
            isStake: move.isStake
          });
        }
      }

      // Call the original minimax function - this preserves the exact algorithm
      const result = originalMinimax.call(this, round, depth, maximizing, alpha, beta);

      // If this is a root or level 1 node, update our visualization with the final scores
      if (depth === 0 && self.nodes.length > 0) {
        // The moveScores array from the AI contains the final scores
        const finalScores = (this as any).moveScores || [];

        // Match up our visualization nodes with the final scores
        for (let i = 0; i < self.nodes.length; i++) {
          const node = self.nodes[i];
          if (node.source === 'root' && i < finalScores.length) {
            // Update with the final score
            node.score = finalScores[i].score || 0;
          }
        }
      }

      return result;
    };
  }

  /**
   * Generate a DOT file for Graphviz visualization
   */
  private generateDotFile(): void {
    let dotContent = 'digraph MinimaxTree {\n';
    dotContent += '  rankdir=TB;\n';
    dotContent += '  node [shape=box, style=filled, fontname="Arial"];\n';
    dotContent += '  edge [fontname="Arial"];\n\n';
    
    // Create a map of connected nodes (nodes that are part of visible paths)
    const connectedNodes = new Map<string, boolean>();
    
    // First, identify all connected nodes by traversing from root
    // This ensures we only show nodes that are part of complete paths
    const traverseNodes = (nodeId: string, visited = new Set<string>()) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      // Mark this node as connected
      connectedNodes.set(nodeId, true);
      
      // Find all child nodes
      const childNodes = this.nodes.filter(n => n.source === nodeId);
      for (const child of childNodes) {
        traverseNodes(child.target, visited);
      }
    };
    
    // Start traversal from root
    traverseNodes('root');
    
    // Add root node
    dotContent += '  // Root node\n';
    dotContent += `  "root" [label="Root State\\nCurrent Game", fillcolor="lightgreen"];\n\n`;
    
    // Organize nodes by depth for better visualization
    dotContent += '  // Organize by depth\n';
    for (let depth = 0; depth <= this.maxDepthToShow; depth++) {
      const nodesAtDepth = this.nodes.filter(n => n.depth === depth && connectedNodes.has(n.target));
      
      // Get unique target nodes at this depth
      const targetNodes = new Set<string>();
      for (const node of nodesAtDepth) {
        targetNodes.add(node.target);
      }
      
      if (targetNodes.size > 0) {
        dotContent += `  { rank=same; `;
        if (depth === 0) {
          dotContent += `"root"; `;
        } else {
          for (const target of targetNodes) {
            dotContent += `"${target}"; `;
          }
        }
        dotContent += `}\n`;
      }
    }
    dotContent += '\n';
    
    // Track nodes we've already added to avoid duplicates
    const addedNodes = new Set<string>();
    addedNodes.add('root'); // Root is already added
    
    // Add connected nodes and edges
    dotContent += '  // Nodes and edges\n';
    for (const node of this.nodes) {
      // Only include nodes that are part of the connected graph
      if (connectedNodes.has(node.source) && connectedNodes.has(node.target)) {
        // Add target node if not already added
        if (!addedNodes.has(node.target)) {
          const moveType = node.isStake ? 'Stake' : 'Play';
          
          // Truncate long card lists for readability
          const cards = node.cards.length > 30 
            ? node.cards.substring(0, 27) + '...' 
            : node.cards;
            
          const label = `${moveType}\\nColumn: ${node.column}\\nCards: ${cards}\\nScore: ${node.score.toFixed(1)}`;
          
          // Color alternates between players
          const color = node.maximizing ? 'lightpink' : 'lightblue';
          
          // Use a different style for promising moves
          const nodeStyle = node.score > 0 
            ? `, penwidth=2, color="darkgreen"` 
            : ``;
          
          dotContent += `  "${node.target}" [label="${label}", fillcolor="${color}"${nodeStyle}];\n`;
          addedNodes.add(node.target);
        }
        
        // Add edge
        const edgeColor = node.score > 0 ? ", color=\"darkgreen\", penwidth=2" : "";
        dotContent += `  "${node.source}" -> "${node.target}" [label="${node.n+1}"${edgeColor}];\n`;
      }
    }
    
    dotContent += '}\n';
    
    // Create directory if it doesn't exist
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write to file
    fs.writeFileSync(this.outputPath, dotContent);
  }
}

/**
 * Helper function to visualize minimax search tree for a given game state
 * @param game The game object
 * @param player The AI player
 * @param outputPath Path to save the DOT file
 * @param maxMovesPerNode Maximum number of moves to show per node
 */
export function visualizeMinimaxTree(
  game: any,
  player: Player,
  outputPath: string = './tmp/minimax-tree.dot',
  maxMovesPerNode: number = 8,
  maxDepthToShow: number = 1
): void {
  const visualizer = new MinimaxVisualizer(game, player, outputPath, maxMovesPerNode, maxDepthToShow);
  visualizer.generateTree();
}
