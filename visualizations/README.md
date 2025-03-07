# Cozen AI Visualizations

This directory contains visualizations for the Cozen AI system.

## Minimax Search Tree Visualization

The `minimax-tree.png` is a visualization of the AI's minimax search tree for a given game state. It shows the top moves considered at each level of the search tree.

### How to Generate

1. Run the visualization CLI using npm scripts:

```bash
# Using the default settings
npm run visualize-minimax

# Customizing the visualization with arguments:
# - outputPath: Path to save the DOT file (default: ./tmp/minimax-tree.dot)
# - maxNodes: Maximum number of moves to show per node (default: 8)
# - maxDepth: Maximum depth to show (default: 1)
npm run visualize-minimax:custom -- ./tmp/minimax-tree.dot 8 2

# Show help
npm run visualize-minimax:help
```

2. Convert the DOT file to an image using Graphviz:

```bash
# Install Graphviz if needed
# macOS: brew install graphviz
# Ubuntu: apt-get install graphviz
# Windows: download from https://graphviz.org/download/

# Generate PNG image
dot -Tpng ./tmp/minimax-tree.dot -o visualizations/minimax-tree.png

# Or generate SVG for better quality
dot -Tsvg ./tmp/minimax-tree.dot -o visualizations/minimax-tree.svg

# Or generate PDF
dot -Tpdf ./tmp/minimax-tree.dot -o visualizations/minimax-tree.pdf
```

### Understanding the Visualization

- **Green Node**: Root node (current game state)
- **Blue Nodes**: Maximizing player (AI)
- **Pink Nodes**: Minimizing player (opponent)
- **Green Edges**: Promising moves (positive score)
- **Node Labels**: Move details including whether it's a stake or play move, which column, cards played, and score
- **Edge Labels**: Move ranking (1 = best move)

The tree shows the search path taken by the AI's minimax algorithm with alpha-beta pruning. Only the top moves (limited by maxNodes parameter) are shown at each level to keep the visualization manageable. The depth can be adjusted with the maxDepth parameter.

### Example Tree

![Minimax Tree Example](minimax-tree.png)

## Customizing the Game State

To visualize a different game state, modify the `createSampleGameState()` function in `visualizeMinimaxCLI.ts` to represent the specific game state you want to analyze.

## Exporting from a Real Game

You can also export the minimax tree from an actual game by adding code like this to your game logic:

```typescript
import { visualizeMinimaxTree } from './utils/minimaxVisualizer';

// When AI is making a move:
visualizeMinimaxTree(game, aiPlayer, './tmp/real-game-minimax.dot', 10);
```