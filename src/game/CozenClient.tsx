import React from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { SocketIO } from 'boardgame.io/multiplayer';
import { MCTSBot } from 'boardgame.io/ai';
import { CozenGame } from './CozenGame';
import { Board as OriginalBoard } from '../components/Board';
import { AIDifficulty, MCTSConfig } from '../ai/aiTypes';
import * as aiUtils from '../ai/aiUtils';
import { enumerate } from '../ai/enumerate';

/**
 * BoardWrapper Component
 *
 * This component wraps the Board component to intercept and debug props from boardgame.io.
 * It also handles a special case where G might be nested inside itself.
 */
const BoardWrapper = (props: any) => {
  // Debug information about the current game state - helps with turn management debugging
  React.useEffect(() => {
    if (props.ctx && props.ctx.currentPlayer) {
      console.log(`BoardWrapper: Player ${props.ctx.currentPlayer}, Turn ${props.ctx.turn}, Phase ${props.ctx.phase}`);
    }
  }, [props.ctx?.currentPlayer, props.ctx?.turn, props.ctx?.phase]);
  
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
  debug: true,
  multiplayer: Local(),
});

// Function to get MCTS configuration based on difficulty
const getMCTSConfig = (difficulty: AIDifficulty): MCTSConfig => {
  // Use much simpler AI settings while debugging
  // These minimalist settings will make the AI faster and less likely to hang
  // We can increase complexity once the basic functionality works
  
  // Every difficulty now uses minimal settings to ensure stability
  return {
    iterations: 20,        // Very low iterations for fast response
    playoutDepth: 2,       // Minimal playout depth
    seed: 'cozen-debug',   // Fixed seed for consistency
    timeout: 1500          // Short timeout to prevent hanging
  };
};

// Create a client with AI opponent using boardgame.io's MCTS bot
export const CozenAIClient = Client({
  game: CozenGame,
  board: Board,
  debug: true, // Keep debug panel enabled for testing
  numPlayers: 2,
  // Use boardgame.io's MCTS bot
  ai: {
    // Only apply AI to black player (playerID: 1)
    '1': {
      bot: MCTSBot,
      enumerate: enumerate,
      objectives: {
        '1': aiUtils.mctsObjective
      },
      // Use easier settings with lower iterations for faster play while testing
      ...getMCTSConfig(AIDifficulty.EASY),
      // Add an explicit timeout to ensure AI doesn't hang
      timeout: 2000
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
