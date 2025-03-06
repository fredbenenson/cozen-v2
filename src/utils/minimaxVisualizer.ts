import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import { AIMove, GameNode, AIDifficulty } from '../ai/aiTypes';
import { CozenAI } from '../ai/cozenAI';
import { Round } from '../types/round';
import { Player } from '../types/player';
import { BaseGameState, Color } from '../types/game';

/**
 * Class for visualizing the Minimax search tree
 */
export class MinimaxVisualizer {
  private nodes: GameNode[] = [];
  private maxMovesPerNode: number = 5;
  private maxDepthToShow: number = 2; // Show two levels of depth by default (root + AI + Human)
  private outputPath: string;
  private gameState: any;
  private ai: CozenAI;
  private debugEnabled: boolean = false; // Whether to show diagnostic nodes

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
    maxDepthToShow: number = 3,
    debug: boolean = true
  ) {
    this.outputPath = outputPath;
    this.maxMovesPerNode = maxMovesPerNode;
    this.maxDepthToShow = maxDepthToShow;
    this.gameState = game;
    this.debugEnabled = debug;

    // Create an AI instance with debug enabled
    this.ai = new CozenAI(player, AIDifficulty.HARD, 3);
    this.ai.enableDebug();

    // Set up node tracking
    this.nodes = [];
    
    // Hook into the minimax function to track nodes
    this.interceptMinimaxFunction();
  }

  /**
   * Generate the minimax tree visualization
   * @param currentRound The current game round
   */
  public generateTree(): void {
    // Store current state
    this.gameState = _.cloneDeep(this.gameState);
    const currentRound = this.gameState.round;

    // Clear the nodes array to start fresh
    this.nodes = [];
    
    // Run the AI to calculate its move (this will populate our nodes)
    console.log("Starting AI calculation to generate minimax tree...");
    
    const result = this.ai.calculateMoveWithStats();
    console.log(`AI calculation complete. Result:`, result ? `Found move for column ${result.move?.column}` : 'No move found');

    // If no nodes were generated, add a diagnostic node
    if (this.nodes.length === 0) {
      console.log("WARNING: No nodes were generated during minimax search!");
      console.log("Adding diagnostic node to help debug the issue...");
      
      // Add a diagnostic node to help see what's happening
      this.nodes.push({
        source: 'root',
        target: 'error_diagnostic',
        n: 0,
        depth: 1,
        score: 0,
        childState: 'error_diagnostic',
        alphaBeta: '',
        beatAlphaBeta: false,
        maximizing: true,
        cards: '',
        column: -1,
        isStake: false,
        label: `No moves were generated.\nMoves: ${result && result.candidateMoves ? result.candidateMoves : 0}`
      });
    }

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

      // We need to explicitly use the player's color to generate moves instead of relying on active player
      const movesForColor = maximizing ? Color.Black : Color.Red;
      
      if (self.debugEnabled) {
        console.log(`Using color ${movesForColor} for ${maximizing ? 'maximizing' : 'minimizing'} at depth ${depth}`);
      }
      
      // Generate moves using the determined color - explicitly enforce the player color
      const allMoves = (this as any).generateMoves(round, movesForColor);
      
      if (self.debugEnabled && depth === 0) {
        console.log(`Generated ${allMoves.length} moves for ${movesForColor} player`);
      }

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

          // Extract the color from the first card ID to check if it matches player
          let cardColor = '';
          if (move.cards.length > 0) {
            const firstCard = move.cards[0];
            if (typeof firstCard === 'string' && firstCard.includes('_')) {
              cardColor = firstCard.split('_')[0]; // "red" or "black"
            }
          }
          
          // Debug card color mismatch between player turn and card color
          if (self.debugEnabled && cardColor) {
            const expectedColor = maximizing ? 'black' : 'red';
            if (cardColor !== expectedColor) {
              console.log(`WARNING: Card color mismatch! ${maximizing ? 'Black' : 'Red'} player has ${cardColor} card at depth ${depth}`);
            }
          }
          
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
            isStake: move.isStake,
            cardColor: cardColor // Store the card color for easier debugging
          });
        }
      }

      // Log the moves we found for debugging - show at all depths within visualization limit
      if (self.debugEnabled && Math.abs(depth) <= self.maxDepthToShow) {
        const playerTurn = maximizing ? 'Black (AI/Max)' : 'Red (Human/Min)';
        console.log(`Minimax at depth=${depth} for ${playerTurn}: Found ${topMoves.length} moves to visualize`);
        topMoves.forEach((move, idx) => {
          console.log(`  Move ${idx}: ${move.isStake ? 'Stake' : 'Play'} column ${move.column}, cards=${move.cards.join(',')}, score=${move.score || 0}`);
        });
      }
      
      // Call the original minimax function - this preserves the exact algorithm
      const result = originalMinimax.call(this, round, depth, maximizing, alpha, beta);

      // If this is a root or level 1 node, update our visualization with the final scores
      // For all depths within our visualization limit, update scores after recursive calls
      if (Math.abs(depth) <= self.maxDepthToShow && self.nodes.length > 0) {
        if (depth === 0) {
          // At the root level, the moveScores array from the AI contains the final scores
          const finalScores = (this as any).moveScores || [];
  
          // Match up our visualization nodes with the final scores
          for (let i = 0; i < self.nodes.length; i++) {
            const node = self.nodes[i];
            if (node.source === 'root' && i < finalScores.length) {
              // Update with the final score
              node.score = finalScores[i].score || 0;
              
              // Mark this with a more prominent final score
              node.label = `Black (AI/Max) ${node.isStake ? 'Stake' : 'Play'}\\nColumn: ${node.column}\\nCards: ${
                node.cards.length > 30 ? node.cards.substring(0, 27) + '...' : node.cards
              }\\nFinal Score: ${node.score.toFixed(1)}\\nMinimax Value: ${node.score.toFixed(1)}`;
            }
          }
        } else {
          // For non-root levels, use the minimax result to update scores
          const parentId = sourceId;
          // Find nodes that have this source
          const childNodes = self.nodes.filter(n => n.source === parentId);
          if (childNodes.length > 0) {
            for (const node of childNodes) {
              // For children, record the minimax result (but don't change existing scores)
              node.minimaxResult = result;
              // Add evaluation info to the label - always include minimax score
              const playerTurn = node.maximizing ? 'Black (AI/Max)' : 'Red (Human/Min)';
              node.label = `${playerTurn} ${node.isStake ? 'Stake' : 'Play'}\\nColumn: ${node.column}\\nCards: ${
                node.cards.length > 30 ? node.cards.substring(0, 27) + '...' : node.cards
              }\\nEval: ${node.score.toFixed(1)}\\nMinimax: ${result.toFixed(1)}`;
            
            }
          }
        }
        
        // Add diagnostic nodes to visualize player alternation and explain the tree
        if (self.nodes.length > 0 && self.debugEnabled) {
          // Add a special node to show player alternation at the beginning
          self.nodes.push({
            source: 'root',
            target: 'player_info',
            n: 997, // High number to position at the end
            depth: 0,
            score: 0,
            childState: 'player_info',
            alphaBeta: '',
            beatAlphaBeta: false,
            maximizing: true,
            cards: '',
            column: -1,
            isStake: false,
            label: `Starting AI: ${this.player.color}\nActive: ${round.activePlayer?.color}`
          });
          
          // Add a legend explaining the colors and structure
          self.nodes.push({
            source: 'root',
            target: 'minimax_legend',
            n: 998, // High number to position at the end
            depth: 0,
            score: 0,
            childState: 'minimax_legend',
            alphaBeta: '',
            beatAlphaBeta: false,
            maximizing: true,
            cards: '',
            column: -1,
            isStake: false,
            label: `MINIMAX TREE LEGEND\n
Blue Nodes: Black AI (maximizing)\nRed Nodes: Red Human (minimizing)\n
Scores are always from Black's perspective:\n • Positive scores favor Black\n • Negative scores favor Red\n
Thicker borders show stronger moves for that player.`
          });
          
          // Add a node showing the alternating pattern
          self.nodes.push({
            source: 'root',
            target: 'alternation_info',
            n: 999, // High number to position at the end
            depth: 0,
            score: 0,
            childState: 'alternation_info',
            alphaBeta: '',
            beatAlphaBeta: false,
            maximizing: true,
            cards: '',
            column: -1,
            isStake: false,
            label: `Minimax Search Pattern:\nDepth 0: Black's moves (AI/Max)\nDepth 1: Red's responses (Human/Min)\nDepth 2: Black's counter-moves (AI/Max)`
          });
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
      // Special handling for diagnostic nodes
      if ((node.target === 'player_info' || node.target === 'minimax_legend' || node.target === 'alternation_info') && node.label) {
        if (!addedNodes.has(node.target)) {
          // Format the label - replace all newlines with \n for DOT format
          const formattedLabel = node.label.replace(/\n/g, '\\n');
          
          // Use different colors for different info nodes
          let fillColor = "lightyellow";
          let shape = "note";
          
          if (node.target === 'minimax_legend') {
            fillColor = "azure";
            shape = "box";
          } else if (node.target === 'alternation_info') {
            fillColor = "lavender";
            shape = "note";
          }
          
          dotContent += `  "${node.target}" [label="${formattedLabel}", fillcolor="${fillColor}", shape="${shape}"];\n`;
          addedNodes.add(node.target);
        }
        dotContent += `  "${node.source}" -> "${node.target}" [style="dashed", color="gray"];\n`;
        continue;
      }
    
      // Only include nodes that are part of the connected graph
      if (connectedNodes.has(node.source) && connectedNodes.has(node.target)) {
        // Add target node if not already added
        if (!addedNodes.has(node.target)) {
          const moveType = node.isStake ? 'Stake' : 'Play';
          
          // Truncate long card lists for readability
          const cards = node.cards.length > 30 
            ? node.cards.substring(0, 27) + '...' 
            : node.cards;
            
          // If the node has a custom label, use it
          const playerTurn = node.maximizing ? 'Black (AI)' : 'Red (Human)';
          
          // Check for color mismatch between player turn and cards
          const expectedColor = node.maximizing ? 'black' : 'red';
          const hasColorMismatch = node.cardColor && node.cardColor !== expectedColor;
          
          // Add warning to label if there's a color mismatch
          let playerCardInfo = '';
          if (hasColorMismatch && node.cardColor) {
            playerCardInfo = `\\n⚠️ ${node.cardColor.toUpperCase()} CARDS!`;
          }
          
          const nodeLabel = node.label || 
            `${playerTurn} ${moveType}\\nColumn: ${node.column}\\nCards: ${cards}${playerCardInfo}\\nScore: ${node.score.toFixed(1)}`;
          
          // Color alternates between players with more distinct colors
          // Use a special warning color if there's a card color mismatch
          let color = node.maximizing ? 'lightskyblue' : 'lightcoral';
          if (hasColorMismatch) {
            // Use a warning color for mismatched card colors
            color = 'gold';
          }
          
          // Use a different style for promising moves based on the minimax score
          // For Black/Max: positive scores are good (thick green border)
          // For Red/Min: negative scores are good (thick red border) from Black's perspective
          let nodeStyle = '';
          const scoreToUse = node.minimaxResult !== undefined ? node.minimaxResult : node.score;
          
          if (node.maximizing) { // Black/AI/Max nodes
            nodeStyle = scoreToUse > 0 
              ? `, penwidth=2.5, color="darkgreen"` 
              : scoreToUse < 0 
                ? `, penwidth=1, color="red"` 
                : ``;
          } else { // Red/Human/Min nodes
            // For minimizing player, a negative score (from AI perspective) is good
            nodeStyle = scoreToUse < 0 
              ? `, penwidth=2.5, color="darkred"` 
              : scoreToUse > 0 
                ? `, penwidth=1, color="green"` 
                : ``;
          }
          
          dotContent += `  "${node.target}" [label="${nodeLabel}", fillcolor="${color}"${nodeStyle}];\n`;
          addedNodes.add(node.target);
        }
        
        // Add edge with appropriate styling based on minimax scores
        let edgeStyle = '';
        const scoreToUse = node.minimaxResult !== undefined ? node.minimaxResult : node.score;
        
        if (node.maximizing) { // Edges to Black/AI/Max nodes
          edgeStyle = scoreToUse > 0 
            ? ", color=\"darkgreen\", penwidth=2" 
            : scoreToUse < 0 
              ? ", color=\"darkred\", penwidth=1" 
              : "";
        } else { // Edges to Red/Human/Min nodes
          edgeStyle = scoreToUse < 0 
            ? ", color=\"darkred\", penwidth=2" 
            : scoreToUse > 0 
              ? ", color=\"darkgreen\", penwidth=1" 
              : "";
        }
        
        // Add the edge move number to help identify the sequence
        dotContent += `  "${node.source}" -> "${node.target}" [label="${node.n+1}"${edgeStyle}];\n`;
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
  maxDepthToShow: number = 1,
  debug: boolean = true
): void {
  const visualizer = new MinimaxVisualizer(game, player, outputPath, maxMovesPerNode, maxDepthToShow, debug);
  visualizer.generateTree();
}
