# Cozen Game AI Visualizer

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