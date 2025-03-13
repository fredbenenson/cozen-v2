import React from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { SocketIO } from 'boardgame.io/multiplayer';
import { CozenGame } from './CozenGame';
import { Board as OriginalBoard } from '../components/Board';
import { CozenBot } from '../ai/CozenBot';
import { AIDifficulty } from '../ai/aiTypes';

/**
 * BoardWrapper Component
 *
 * This component wraps the Board component to intercept and debug props from boardgame.io.
 * It also handles a special case where G might be nested inside itself.
 *
 * The normal props structure from boardgame.io is:
 * {
 *   G: { players: {...}, board: [...], ... },  // Our game state (CozenState)
 *   ctx: { ... },                             // Game context (turns, phases, etc.)
 *   moves: { ... },                           // Functions to update the game state
 *   ...other props
 * }
 */
/**
 * BoardWrapper Component
 *
 * Handles the case where boardgame.io might provide a doubly-nested G structure.
 */
const BoardWrapper = (props: any) => {
  // Handle case where G is incorrectly nested (G.G instead of just G)
  if (props.G && !props.G.players && props.G.G) {
    // Create a new props object with the corrected structure
    const fixedProps = {
      ...props,
      G: props.G.G // Unwrap the nested G
    };

    return <OriginalBoard {...fixedProps} />;
  }

  // Pass props directly to the Board component
  return <OriginalBoard {...props} />;
};

// Use the wrapped board component
const Board = BoardWrapper;

// Import initialization complete

// Create a client with local multiplayer (for testing)
export const CozenLocalClient = Client({
  game: CozenGame,
  board: Board,
  debug: false,
  multiplayer: Local(),
});

// Function to create a fresh CozenBot instance
// This allows us to get a new AI instance for each move, avoiding state corruption
const createCozenBot = () => {
  console.log("===============================");
  console.log("CREATING NEW COZEN BOT INSTANCE");
  console.log("Time:", new Date().toISOString());
  console.log("===============================");
  
  // Create a new bot for the black player (1) with medium difficulty
  const bot = new CozenBot('1', AIDifficulty.MEDIUM, true);
  return bot;
};

// Create a client with AI opponent using our minimax algorithm
export const CozenAIClient = Client({
  game: CozenGame,
  board: Board,
  debug: true, // Enable debug panel to see more information
  numPlayers: 2,
  // Use our custom CozenBot implementation
  ai: {
    // Only apply AI to black player (playerID: 1)
    '1': {
      // Use our custom CozenBot instead of MCTSBot
      bot: createCozenBot
    }
  },
});

// Create a client with online multiplayer
export const CozenOnlineClient = (serverURI: string) => Client({
  game: CozenGame,
  board: Board,
  debug: false,
  multiplayer: SocketIO({ server: serverURI }),
});

// Component for local play
export const LocalGameComponent = () => (
  <div>
    <h1>Cozen - Local Game</h1>
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ margin: '0 20px' }}>
        <h2>Red Player</h2>
        <CozenLocalClient playerID="0" />
      </div>
      <div style={{ margin: '0 20px' }}>
        <h2>Black Player</h2>
        <CozenLocalClient playerID="1" />
      </div>
    </div>
  </div>
);

// Component for playing against AI
export const AIGameComponent = () => {
  // Error boundary to handle client initialization errors
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);

  // Use effect to initialize the game safely
  React.useEffect(() => {
    try {
      console.log("AIGameComponent mounted");
      setIsLoading(false);

      // Set a loading timeout to detect if the game isn't initializing properly
      // But only if the game really isn't loading
      const timeoutId = setTimeout(() => {
        // Check if there are any game-related elements on the page
        const boardElements = document.querySelectorAll('.board, .hand, .game-grid, .player-info');
        if (boardElements.length === 0) {
          // Only show timeout if no game elements are found
          console.warn("Game initialization timeout reached - possible stuck state");
          setLoadingTimeout(true);
        } else {
          console.log("Game elements found on page, not showing timeout warning");
        }
      }, 8000); // 8 seconds timeout (increase from 5s to 8s to give more time)

      return () => clearTimeout(timeoutId);
    } catch (err: any) {
      console.error("Error initializing game:", err);
      setError(err);
    }
  }, []);

  // Show error state if needed
  if (error) {
    return (
      <div style={{ color: 'red', padding: '20px', textAlign: 'center' }}>
        <h2>Error Loading Game</h2>
        <p>{error.message}</p>
        <pre style={{ textAlign: 'left', marginTop: '20px', padding: '10px', backgroundColor: '#f8f8f8', overflow: 'auto' }}>
          {error.stack}
        </pre>
        <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Reload Page
        </button>
      </div>
    );
  }

  // Render the game
  return (
    <div>
      <CozenAIClient playerID="0" key={`cozen-client-${Date.now()}`} />
    </div>
  );
};

// Component for joining an online game
export const OnlineGameComponent = ({ matchID, playerID, serverURI }: { matchID: string; playerID: string; serverURI: string }) => {
  const CozenClient = CozenOnlineClient(serverURI);

  return (
    <div>
      <h1>Cozen - Online Game</h1>
      <CozenClient matchID={matchID} playerID={playerID} />
    </div>
  );
};
