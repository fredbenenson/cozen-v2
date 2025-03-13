import React, { useState, useEffect } from 'react';
import { BoardProps } from 'boardgame.io/react';
import { CozenState, Card, Position } from '../types/game';
import './Board.css';
import { enableGameLogging, disableGameLogging } from '../game/CozenGame';
import { CardComponent } from './CardComponent';
import { CardArrayComponent } from './CardArrayComponent';
import { CustomCursorComponent } from './CustomCursorComponent';
import { GameInfoComponent } from './GameInfoComponent';
import { GridCellComponent } from './GridCellComponent';
import { OpponentInfoComponent } from './OpponentInfoComponent';
import { PlayerInfoComponent } from './PlayerInfoComponent';
import { RoundEndOverlayComponent } from './RoundEndOverlayComponent';

// Define the structure of props received from boardgame.io
interface BoardgameIOProps {
  G: CozenState;
  ctx: any;
  playerID: string;
  moves: Record<string, Function>;
  events: Record<string, Function>;
  [key: string]: any;
}

// Board component receives props from boardgame.io
export function Board(props: BoardProps<BoardgameIOProps>) {
  // Destructure the props to access what we need
  // Example of these properties:
  // - G: { players: {red: {...}, black: {...}}, board: [...], roundState: "running", ... }
  // - ctx: { currentPlayer: "0", phase: "play", turn: 1, ... }
  // - moves: { stakeCard: Function, wagerCards: Function }
  const { G, ctx, moves, events } = props;

  // IMPORTANT: G already contains our CozenState, no need for additional variable
  // We'll use G directly throughout this component

  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isCursorVisible, setIsCursorVisible] = useState(false);
  const [showOpponentCards, setShowOpponentCards] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Force a re-render after a short delay to ensure proper initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasInitialized(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Enable game logging once the board component mounts
  useEffect(() => {
    // Wait a short time to ensure all initial AI calculations are done
    const timer = setTimeout(() => {
      enableGameLogging();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Simple toggle to flip cards visually (purely client-side)
  const toggleOpponentCards = () => {
    // Just toggle the UI state for the card flip animation
    setShowOpponentCards(!showOpponentCards);
    console.log(`Card peek mode ${!showOpponentCards ? "enabled" : "disabled"}`);
  };

  // Monitor for turn changes and manage logging
  useEffect(() => {
    if (!ctx) return; // Add defensive check

    // Is it the AI's turn? (player '1' is AI/Black)
    if (ctx.currentPlayer === '1') {
      disableGameLogging();
    } else {
      enableGameLogging();
    }
  }, [ctx?.currentPlayer]);

  // Track mouse movement for custom cursor
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
      setIsCursorVisible(true);
    };

    const handleMouseLeave = () => {
      setIsCursorVisible(false);
    };

    if (selectedCards.length > 0) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseleave', handleMouseLeave);

      // Add a class to the body to hide the default cursor
      document.body.classList.add('cursor-card');
    } else {
      document.body.classList.remove('cursor-card');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.body.classList.remove('cursor-card');
    };
  }, [selectedCards]);

  // Always set the human player to Red and the AI to Black for consistent UI
  // Note: playerID is "0" for first player, "1" for second player
  // Use type assertions to avoid string literal type issues
  const currentColor = 'red' as string;  // Human player is always red
  const opponentColor = 'black' as string; // AI/opponent is always black

  // Keep a reference to direct player objects for easier access later
  let playerRed, playerBlack;

  // Get player objects directly from the game state
  // We'll store references to the current player and opponent
  let player: any, opponent: any;

  try {
    // Get player objects based on color
    player = currentColor === 'red' ? G.players.red : G.players.black;
    opponent = opponentColor === 'black' ? G.players.black : G.players.red;
  } catch (error) {
    console.error("Error while getting player objects:", error);
  }

  // Show message
  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // Get next available stake column - player is always red
  const getNextStakeColumn = (): number | undefined => {
    if (!player?.availableStakes || player.availableStakes.length === 0) return undefined;

    // Always use the Red staking pattern since player is always Red
    // Red stakes columns from left to right (5, 6, 7, 8, 9)
    return player.availableStakes.sort((a: number, b: number) => a - b)[0];
  };

  // Check if a column is valid for wagering (must have a stake card)
  const isWagerableColumn = (columnIndex: number): boolean => {
    // Column must have a stake card to be wagerable
    // G.board[columnIndex] is a Column object that may have a stakedCard
    const hasStakedCard = G.board[columnIndex]?.stakedCard !== undefined;
    return hasStakedCard;
  };

  // Check if a specific position is valid for wagering for the current player
  const isWagerablePosition = (rowIndex: number, columnIndex: number, playerColor: 'red' | 'black'): boolean => {
    // Current human player is always red ('0')
    const currentPlayerColor = 'red'; // Human player is always red

    // Column must have a stake card
    if (!isWagerableColumn(columnIndex)) {
      return false;
    }

    // Position must be empty and belong to the current player
    // For red player, check red positions (6-10)
    // For black player, check black positions (0-4)
    // The position's owner field should match the current player
    const position = G.board[columnIndex]?.positions?.find(
      (p: { coord: [number, number]; owner: string }) => p.coord[0] === rowIndex && p.coord[1] === columnIndex && p.owner === currentPlayerColor
    );

    return !!position && !position.card;
  };

  // Toggle card selection
  const toggleCardSelection = (card: Card) => {
    if (ctx.currentPlayer !== '0') { // Player is always red ('0')
      showMessage("It's not your turn!");
      return;
    }

    if (selectedCards.some(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  // Select a column
  const selectColumn = (columnIndex: number) => {
    if (ctx.currentPlayer !== '0') { // Player is always red ('0')
      showMessage("It's not your turn!");
      return;
    }

    // Check if this column has a stake card
    if (!G.board[columnIndex].stakedCard) {
      showMessage("Can't select a column without a stake card!");
      return;
    }

    // Toggle selection
    setSelectedColumn(columnIndex === selectedColumn ? null : columnIndex);

    console.log(`Selected column: ${columnIndex}`);
  };

  // Stake a card
  const stakeCard = (columnIndex?: number) => {
    if (ctx.currentPlayer !== '0') { // Player is always red ('0')
      showMessage("It's not your turn!");
      return;
    }

    if (selectedCards.length !== 1) {
      showMessage('You must select exactly one card to stake.');
      return;
    }

    if (player?.availableStakes?.length === 0) {
      showMessage('No available columns to stake!');
      return;
    }

    // Get next column that will be staked (always left-to-right for red, starting from column 5)
    // If a specific column was clicked, use that if it's available
    let nextStakeColumn = columnIndex !== undefined && player.availableStakes.includes(columnIndex)
      ? columnIndex
      : Math.min(...player.availableStakes);

    // Display debug info
    console.log("Staking card:", selectedCards[0]);
    console.log("Will stake in column:", nextStakeColumn);
    console.log("Available stakes:", player.availableStakes);

    // Show where the stake will be placed
    showMessage(`Staking in column ${nextStakeColumn}`);

    // Execute the stake move (returns INVALID_MOVE if it fails)
    const invalidMove = 'INVALID_MOVE';
    moves.stakeCard(selectedCards[0].id);

    // We can't actually check the result in strict mode since it returns void
    // The game state will update automatically via boardgame.io

    // Reset selections
    setSelectedCards([]);
    setSelectedColumn(null);
  };

  // Wager cards
  const wagerCards = (columnIndex?: number) => {
    if (ctx.currentPlayer !== '0') { // Player is always red ('0')
      showMessage("It's not your turn!");
      return;
    }

    if (selectedCards.length === 0) {
      showMessage('You must select at least one card to wager.');
      return;
    }

    // If a column is provided, use that. Otherwise, use the selected column
    const targetColumn = columnIndex !== undefined ? columnIndex : selectedColumn;

    if (targetColumn === null) {
      showMessage('You must select a column to wager on.');
      return;
    }

    // Check if the column has a stake card
    if (!isWagerableColumn(targetColumn)) {
      showMessage('This column doesn\'t have a stake card to wager on.');
      return;
    }

    // Display debug info
    console.log("Wagering cards:", selectedCards);
    console.log("Selected column:", targetColumn);

    // Execute the wager move
    console.log(`Executing wagerCards move with cards:`, selectedCards.map(c => c.id), `and column:`, targetColumn);
    moves.wagerCards(selectedCards.map(c => c.id), targetColumn);

    // We can't actually check the result in strict mode since it returns void
    // The game state will update automatically via boardgame.io

    // Reset selections
    setSelectedCards([]);
    setSelectedColumn(null);
  };

  // State for round transitions
  const [showRoundEnd, setShowRoundEnd] = useState(false);
  const [roundEndData, setRoundEndData] = useState<{
    redVP: number;
    blackVP: number;
    redVPGained: number;
    blackVPGained: number;
    nextPlayer: string;
  } | null>(null);

  // Watch for phase changes and show messages
  // This effect runs whenever the game phase or state changes
  useEffect(() => {
    console.log(`Phase changed to: ${ctx.phase}`);

    // When the round ends, we want to show a transition screen
    if (ctx.phase === 'roundEnd') {
      console.log('Phase is roundEnd! Should display transition screen');
      console.log('Round state:', G.roundState);
      console.log('Victory points:', G.players.red.victory_points, G.players.black.victory_points);

      // Save current state data for the round end screen
      // This data will be displayed in the transition overlay
      setRoundEndData({
        redVP: G.players.red.victory_points,
        blackVP: G.players.black.victory_points,
        redVPGained: G.victoryPointScores?.red || 0,
        blackVPGained: G.victoryPointScores?.black || 0,
        nextPlayer: G.activePlayer
      });

      // Set our UI state to show the round end screen
      setShowRoundEnd(true);

      // Keep this screen visible for at least 5 seconds
      setTimeout(() => {
        setShowRoundEnd(false);
      }, 5000);

      showMessage('Round Complete! Starting next round...');
    }
  }, [ctx.phase, G]);

  // Effect to handle AI moves - force UI update after AI moves
  useEffect(() => {
    // This ensures the board updates when players change
    const isAITurn = !props.isActive && ctx.currentPlayer === '1';

    if (isAITurn) {
      console.log("Detected AI turn, board state:", G.board?.length || 0, "columns");
      console.log("AI active:", G.activePlayer === 'black');

      // Force a full board re-render after AI's turn
      const boardElement = document.querySelector('.game-board');
      if (boardElement) {
        // Apply a tiny visual change to force React to update the DOM
        boardElement.classList.add('ai-turn');
        setTimeout(() => {
          boardElement.classList.remove('ai-turn');
        }, 100);
      }
    }
  }, [ctx.currentPlayer, G.activePlayer, props.isActive, G.board]);

  // Render the grid-based board
  const renderGrid = () => {
    if (!G?.board) return null;
    const gridCells = [];

    // Black player rows (0-4)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        const position = G.board[col]?.positions?.find(
          (p: Position) => p.owner === 'black' && p.coord[0] === row
        );

        const hasCard = position?.card !== undefined;
        const canWager = selectedCards.length > 0 && position && isWagerablePosition(row, col, 'black');
        const showWagerHighlight = canWager && ctx.currentPlayer === '0';

        gridCells.push(
          <GridCellComponent
            key={`black-${row}-${col}`}
            row={row}
            col={col}
            position={position}
            G={{
              board: G.board,
              players: { red: G.players.red }
            }}
            selectedColumn={selectedColumn}
            selectedCards={selectedCards}
            canWager={canWager}
            showWagerHighlight={showWagerHighlight}
            hasCard={hasCard}
            showOpponentCards={showOpponentCards}
            cellType="black"
            handleClick={() => {
              if (canWager) {
                console.log(`Trying to wager on column ${col} (Black position, row ${row})`);
                wagerCards(col);
              } else if (hasCard && G.board[col].stakedCard) {
                selectColumn(col);
              }
            }}
          />
        );
      }
    }

    // Stake row (5)
    for (let col = 0; col < 10; col++) {
      const isAvailableForStake = player?.availableStakes?.includes(col);
      const canStakeHere = selectedCards.length === 1 && isAvailableForStake;

      gridCells.push(
        <GridCellComponent
          key={`stake-${col}`}
          row={0}
          col={col}
          G={{
            board: G.board,
            players: { red: G.players.red }
          }}
          selectedColumn={selectedColumn}
          selectedCards={selectedCards}
          canWager={false}
          showWagerHighlight={false}
          hasCard={G.board[col]?.stakedCard !== undefined}
          showOpponentCards={showOpponentCards}
          cellType="stake"
          handleClick={() => {
            if (canStakeHere) {
              stakeCard(col);
            } else if (G.board[col].stakedCard) {
              selectColumn(col);
            }
          }}
        />
      );
    }

    // Red player rows (6-10)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        const boardRow = row + 6;

        const position = G.board[col]?.positions?.find(
          (p: Position) => p.owner === 'red' && p.coord[0] === boardRow
        );

        const hasCard = position?.card !== undefined;
        const canWager = selectedCards.length > 0 && position && isWagerablePosition(boardRow, col, 'red');
        const showWagerHighlight = canWager && ctx.currentPlayer === '0';

        gridCells.push(
          <GridCellComponent
            key={`red-${row}-${col}`}
            row={row}
            col={col}
            position={position}
            G={{
              board: G.board,
              players: { red: G.players.red }
            }}
            selectedColumn={selectedColumn}
            selectedCards={selectedCards}
            canWager={canWager}
            showWagerHighlight={showWagerHighlight}
            hasCard={hasCard}
            showOpponentCards={showOpponentCards}
            cellType="red"
            handleClick={() => {
              if (canWager) {
                console.log(`Trying to wager on column ${col} (Red position, row ${boardRow})`);
                wagerCards(col);
              } else if (hasCard && G.board[col].stakedCard) {
                selectColumn(col);
              }
            }}
          />
        );
      }
    }

    return gridCells;
  };

  // Debug trigger
  const triggerRoundEnd = () => {
    setRoundEndData({
      redVP: G.players.red.victory_points,
      blackVP: G.players.black.victory_points,
      redVPGained: G.victoryPointScores?.red || 0,
      blackVPGained: G.victoryPointScores?.black || 0,
      nextPlayer: G.activePlayer
    });
    setShowRoundEnd(true);
    console.log("Manual round end screen triggered");

    setTimeout(() => {
      setShowRoundEnd(false);
      console.log("Round end screen hidden");
    }, 5000);
  };

  const debugTrigger = (
    <button
      onClick={triggerRoundEnd}
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        zIndex: 999,
        padding: '5px 10px',
        backgroundColor: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px'
      }}
    >
      Test Round End
    </button>
  );

  return (
    <>
      {debugTrigger}
      <div className="board">
        <OpponentInfoComponent
          opponent={opponent}
          showOpponentCards={showOpponentCards}
          toggleOpponentCards={toggleOpponentCards}
        />

        <div className="game-grid">
          {renderGrid()}
        </div>

        <PlayerInfoComponent
          player={player}
          color="red"
          selectedCards={selectedCards}
          toggleCardSelection={toggleCardSelection}
        />

        <GameInfoComponent
          ctx={ctx}
          G={{
            roundState: G.roundState,
            players: {
              red: { hand: G.players.red.hand },
              black: { hand: G.players.black.hand }
            }
          }}
          message={message}
        />

        <CustomCursorComponent
          isCursorVisible={isCursorVisible}
          selectedCards={selectedCards}
          cursorPosition={cursorPosition}
        />
      </div>

      <RoundEndOverlayComponent
        showRoundEnd={showRoundEnd}
        roundEndData={roundEndData}
      />
    </>
  );
}
