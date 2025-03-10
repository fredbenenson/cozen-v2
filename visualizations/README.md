# Cozen AI Visualizations

This directory contains visualizations for the Cozen AI system.

## Visualization Types

The project includes two main types of AI visualizations:

1. **Static Minimax Search Tree** - Visual diagrams of the AI's decision tree
2. **Interactive Web Visualizer** - Real-time exploration of AI moves and evaluations

## Minimax Search Tree Visualization

The `minimax-tree.pdf` is a visualization of the AI's minimax search tree for a given game state. It shows the top moves considered at each level of the search tree.

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

## Web-Based Interactive Visualizer

This web-based visualization tool allows you to explore the AI's decision-making process in the Cozen card game. The visualization uses the actual game engine and minimax AI implementation to show possible moves and evaluate game states.

## Features

- Interactive visualization of the current game state
- Display of all possible moves with their scores
- Minimax evaluation of moves with configurable search depth
- Hierarchical display of game states after applying moves
- Real-time interaction with the actual game engine

## How It Works

This visualization tool runs as a web application with:

1. **Backend**: A Node.js Express server that interfaces with the actual Cozen game engine and AI
2. **Frontend**: A single-page web application that renders the game state and provides interactive controls

The key advantage of this approach is that we're using the actual game logic and AI implementation, not a separate reimplementation. This ensures the visualization accurately represents the AI's decision-making process.

## Getting Started

To run the visualizer:

1. Install dependencies:
   ```
   npm install
   ```

2. Run the visualizer server:
   ```
   npm run visualizer
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Using the Visualizer

1. **View Game State**: The current game state is displayed at the top of the page, showing the board, players' hands, and available stakes.

2. **Explore Moves**: All possible moves for the active player are listed below the game state, sorted by score.

3. **Select a Move**: Click on a move to see what the game state would look like after applying that move. The selected move will be highlighted.

4. **Adjust Search Depth**: Use the dropdown in the top-right to change the minimax search depth. Deeper searches provide more accurate evaluations but take longer.

5. **Reset Game**: Click the Reset button to start over with the initial game state.

## Technical Details

The visualization uses a client-server architecture:

- **Server**: The Express server in `src/tools/visualizerServer.ts` provides API endpoints to:
  - Retrieve the current game state
  - Generate and evaluate possible moves
  - Apply moves to the game state
  - Reset the game

- **Client**: The web frontend in `visualizations/web/` renders the game state and provides interactive controls.

All game logic, including move generation and evaluation, uses the actual codebase from the Cozen game engine.

## Future Enhancements

- Add support for full game tree exploration (beyond just the immediate moves)
- Implement highlighting of optimal moves in the game tree
- Add animation to show the progression of the game
- Support for custom starting positions
- Real-time multiplayer mode where users can play against the AI