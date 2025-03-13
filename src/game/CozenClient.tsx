import React from 'react';
// Try alternative import in case there's an issue with current imports
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { SocketIO } from 'boardgame.io/multiplayer';
import { RandomBot } from 'boardgame.io/ai'; // Using RandomBot instead of MCTSBot which isn't in our typedef
import { CozenGame } from './CozenGame';
import { Board as OriginalBoard } from '../components/Board';
import { enumerate } from '../ai/enumerate';

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
const BoardWrapper = (props: any) => {
  console.log("BoardWrapper props received:", { 
    hasG: !!props.G, 
    hasPlayers: props.G && !!props.G.players,
    playerKeys: props.G?.players ? Object.keys(props.G.players) : [],
    gameState: props.G ? Object.keys(props.G) : []
  });
  
  // Check and validate the G object
  if (props.G) {
    try {
      // Verify the expected structure
      console.log("G properties:", {
        roundState: props.G.roundState,
        activePlayer: props.G.activePlayer,
        hasBoard: Array.isArray(props.G.board)
      });
      
      // Handle case where G is incorrectly nested (G.G instead of just G)
      // This is a workaround for a boardgame.io issue
      if (!props.G.players && props.G.G) {
        console.log("Fixed nested G structure (G.G -> G)");
        
        // Create a new props object with the corrected structure
        const fixedProps = {
          ...props,
          G: props.G.G  // Use the nested G as the main G
        };
        
        return <OriginalBoard {...fixedProps} />;
      }
    } catch (err) {
      console.error("Error inspecting props.G:", err);
    }
  }
  
  // Pass props through to the Board component
  return <OriginalBoard {...props} />;
};

// Use the wrapped board component
const Board = BoardWrapper;

// Debug helper to check if boardgame.io modules are loaded correctly
console.log('Checking boardgame.io imports:');
console.log(' - Client available:', typeof Client);
console.log(' - Local available:', typeof Local);
console.log(' - SocketIO available:', typeof SocketIO);
console.log(' - RandomBot available:', typeof RandomBot);
console.log(' - Enumerate function:', typeof enumerate);

// Debug boardgame.io imports
console.log('Boardgame.io imports:', {
  Client: typeof Client, 
  Local: typeof Local,
  SocketIO: typeof SocketIO,
  RandomBot: typeof RandomBot
});

// Create a client with local multiplayer (for testing)
export const CozenLocalClient = Client({
  game: CozenGame,
  board: Board,
  debug: false,
  multiplayer: Local(),
});

// Create a client with AI opponent
// Wrap the CozenGame to provide better error handling
const SafeCozenGame = {
  ...CozenGame,
  setup: (ctx: any, setupData?: any) => {
    try {
      console.log("SafeCozenGame setup called with:", { ctx, setupData });
      const result = CozenGame.setup(ctx, setupData);
      console.log("SafeCozenGame setup successful, state keys:", Object.keys(result));
      return result;
    } catch (error) {
      console.error("CRITICAL ERROR in game setup:", error);
      // Return a minimal valid state instead of crashing that matches the CozenState type
      return {
        players: {
          red: {
            hand: [],
            jail: [],
            cards: [],
            victory_points: 0,
            availableStakes: [],
            stake_offset: 1
          },
          black: {
            hand: [],
            jail: [],
            cards: [],
            victory_points: 0,
            availableStakes: [],
            stake_offset: -1
          }
        },
        board: [],
        firstStakes: { red: [], black: [] },
        roundState: 'running' as 'running',
        activePlayer: 'black' as 'black',
        inactivePlayer: 'red' as 'red',
        cardsJailed: 0,
        isFirstRound: true,
        turnCount: 1,
        developerMode: true,
        victoryPointScores: { red: 0, black: 0 }
      };
    }
  }
};

// Directly use the unmodified game object for consistency
export const CozenAIClient = Client({
  game: CozenGame, // Use the original game object directly 
  board: Board,
  debug: true, // Enable debug to see more information
  numPlayers: 2,
  // Simpler AI configuration
  ai: {
    enumerate,
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

  // Show a message if loading takes too long
  if (loadingTimeout) {
    // Check if the game board is visible but the message is still showing
    const boardElements = document.querySelectorAll('.board, .hand, .game-grid, .player-info');
    const isGameVisible = boardElements.length > 0;
    
    // If game is visible, show a smaller notification instead of full screen message
    if (isGameVisible) {
      return (
        <>
          <div style={{ 
            position: 'fixed', 
            top: '10px', 
            right: '10px', 
            background: 'rgba(255,240,200,0.95)', 
            padding: '10px 15px',
            borderRadius: '5px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            zIndex: 1000,
            maxWidth: '300px'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
              Game is loading, but taking longer than expected...
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setLoadingTimeout(false)} 
                style={{ 
                  padding: '3px 8px', 
                  fontSize: '12px',
                  background: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
          
          {/* Render the game normally */}
          <div>
            <h2 style={{ 
              textAlign: 'center', 
              color: '#444',
              margin: '0 0 20px 0',
              fontWeight: 'normal'
            }}>
              Playing against AI
            </h2>
            <div className="controls" style={{ textAlign: 'center', marginBottom: '20px' }}>
              <button 
                onClick={() => window.location.reload()} 
                style={{ padding: '8px 16px', marginRight: '10px' }}
              >
                Reload Game
              </button>
            </div>
            
            {/* Add a custom debug wrapper component */}
            <GameClientDebugWrapper>
              <CozenAIClient playerID="0" key={`cozen-client-${Date.now()}`} />
            </GameClientDebugWrapper>
          </div>
        </>
      );
    }
    
    // Otherwise, show the full screen message
    return (
      <div style={{ color: 'orange', padding: '20px', textAlign: 'center' }}>
        <h2>Game Initialization Taking Longer Than Expected</h2>
        <p>The game is taking longer than usual to load. This might be due to:</p>
        <ul style={{ textAlign: 'left', display: 'inline-block' }}>
          <li>AI processing initial game state</li>
          <li>Issues with game initialization</li>
          <li>Problems with board rendering</li>
        </ul>
        <div style={{ marginTop: '20px' }}>
          <button onClick={() => window.location.reload()} style={{ marginRight: '10px', padding: '8px 16px' }}>
            Reload Page
          </button>
          <button onClick={() => setLoadingTimeout(false)} style={{ padding: '8px 16px' }}>
            Continue Waiting
          </button>
        </div>
      </div>
    );
  }

  // Render the game
  return (
    <div>
      <h2 style={{ 
        textAlign: 'center', 
        color: '#444',
        margin: '0 0 20px 0',
        fontWeight: 'normal'
      }}>
        Playing against AI
      </h2>
      <div className="controls" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button 
          onClick={() => window.location.reload()} 
          style={{ padding: '8px 16px', marginRight: '10px' }}
        >
          Reload Game
        </button>
      </div>
      
      {/* Add a custom debug wrapper component */}
      <GameClientDebugWrapper>
        <CozenAIClient playerID="0" key={`cozen-client-${Date.now()}`} />
      </GameClientDebugWrapper>
    </div>
  );
};

// Debug wrapper component to monitor props passed to children
const GameClientDebugWrapper: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [hasChildren, setHasChildren] = React.useState(false);
  const [debugInfo, setDebugInfo] = React.useState<any>(null);
  
  // Check if a valid child is rendered
  React.useEffect(() => {
    const childrenArr = React.Children.toArray(children);
    console.log("GameClientDebugWrapper children:", childrenArr.length);
    
    // Access any props for debugging
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        console.log("Child element props:", child.props);
        try {
          const type = typeof child.type === 'function' 
            ? child.type.name || 'FunctionComponent'
            : String(child.type);
            
          setDebugInfo({
            type,
            hasProps: Object.keys(child.props).length > 0,
            propKeys: Object.keys(child.props)
          });
        } catch (err) {
          console.error("Error processing child element:", err);
          setDebugInfo({
            type: "Unknown",
            hasProps: false,
            propKeys: []
          });
        }
      }
    });
    
    setHasChildren(childrenArr.length > 0);
  }, [children]);
  
  return (
    <div className="debug-wrapper">
      {/* Debug info */}
      {debugInfo && (
        <div style={{ 
          margin: '10px 0', 
          padding: '10px', 
          backgroundColor: '#f9f9f9', 
          border: '1px solid #ddd', 
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <div>Client Type: {debugInfo.type}</div>
          <div>Has Props: {String(debugInfo.hasProps)}</div>
          <div>Prop Keys: {debugInfo.propKeys.join(', ')}</div>
        </div>
      )}
      
      {/* Render the actual children */}
      {children}
      
      {/* Fallback if no children */}
      {!hasChildren && (
        <div style={{ color: 'red', padding: '20px', textAlign: 'center' }}>
          Error: No valid game client component found!
        </div>
      )}
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