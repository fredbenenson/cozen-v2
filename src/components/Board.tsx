import React, { useState, useEffect } from 'react';
import { BoardProps } from 'boardgame.io/react';
import { CozenState, Card } from '../types/game';
import { Color, Rank, Suit } from '../types/game';
import './Board.css';
import { enableGameLogging, disableGameLogging } from '../game/CozenGame';
import { BOARD, isValidWagerPosition } from '../utils/moveValidation';
import { getCardDisplayValue, getCardRankSymbol } from '../utils/cardUtils';

export function Board({ G, ctx, moves }: any) {
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isCursorVisible, setIsCursorVisible] = useState(false);
  
  // Enable game logging once the board component mounts
  // This way, AI's initial moves won't flood the console
  useEffect(() => {
    // Wait a short time to ensure all initial AI calculations are done
    const timer = setTimeout(() => {
      enableGameLogging();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Monitor for turn changes and manage logging
  useEffect(() => {
    // Is it the AI's turn? (player '1' is AI/Black)
    if (ctx.currentPlayer === '1') {
      disableGameLogging();
    } else {
      enableGameLogging();
    }
  }, [ctx.currentPlayer]);
  
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
  const currentColor = 'red';  // Human player is always red
  const opponentColor = 'black'; // AI/opponent is always black

  // Add defensive checks for when G might be transitioning between rounds
  if (!G || !G.players) {
    return <div className="board">Loading game state...</div>;
  }

  const player = G.players[currentColor];
  const opponent = G.players[opponentColor];
  
  // Another defensive check for player objects
  if (!player || !opponent) {
    return <div className="board">Initializing players...</div>;
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
    return player.availableStakes.sort((a, b) => a - b)[0];
  };
  
  // Check if a column is valid for wagering
  const isWagerableColumn = (columnIndex: number): boolean => {
    // Column must have a stake card to be wagerable
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
      p => p.coord[0] === rowIndex && p.coord[1] === columnIndex && p.owner === currentPlayerColor
    );
    
    return position && !position.card;
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
    const result = moves.stakeCard(selectedCards[0].id);

    // Check if the move was invalid
    if (result === 'INVALID_MOVE') {
      showMessage('Invalid move! Cannot stake in this column.');
      return;
    }

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
    const result = moves.wagerCards(selectedCards.map(c => c.id), targetColumn);
    
    // Check if move failed
    if (result === 'INVALID_MOVE') {
      console.error('Wager move failed with INVALID_MOVE response');
      showMessage('Invalid wager move!');
      return;
    }

    // Reset selections
    setSelectedCards([]);
    setSelectedColumn(null);
  };

  // Render a card (face up or card back)
  const renderCard = (card: Card | null, showBack: boolean = false) => {
    if (!card) return null;
    
    // If we want to show the card back (for opponent's cards)
    if (showBack) {
      return (
        <div
          key={card.id}
          className="card-back"
        />
      );
    }
    
    // Use our utility function to get the card display value
    const cardValue = getCardDisplayValue(card);
    return (
      <div
        key={card.id}
        className={`card ${card.color === Color.Red ? 'red-card' : 'black-card'}`}
        data-value={cardValue}
      />
    );
  };

  // Render a card for display
  const renderCardArray = (cards: Card[] | Card, showBack: boolean = false) => {
    if (!cards) return null;
    
    // Even though we now only store single cards per position,
    // keep this function to handle any legacy data format 
    // or future changes
    if (Array.isArray(cards)) {
      if (cards.length === 0) return null;
      return renderCard(cards[0], showBack);
    } else {
      return renderCard(cards, showBack);
    }
  };

  // Render player hand
  const renderHand = () => {
    if (!player?.hand) return null;

    return player.hand.map(card => {
      if (!card) return null;
      
      // Use our utility function for consistent card display
      const cardValue = getCardDisplayValue(card);
      
      return (
        <div
          key={card.id}
          className={`card ${card.color === Color.Red ? 'red-card' : 'black-card'} ${selectedCards.some(c => c.id === card.id) ? 'selected' : ''}`}
          data-value={cardValue}
          onClick={() => toggleCardSelection(card)}
        />
      );
    });
  };
  
  // Render custom cursor for selected cards
  const renderCustomCursor = () => {
    if (!isCursorVisible || selectedCards.length === 0) return null;
    
    const showStack = selectedCards.length > 1;
    const maxVisibleCards = Math.min(selectedCards.length, 3);
    const firstCard = selectedCards[0];
    
    // Use our utility function to get the card rank symbol
    const cardValue = getCardRankSymbol(firstCard.number);
    const isRed = firstCard.color === Color.Red;

    return (
      <div 
        className="custom-cursor"
        style={{
          display: isCursorVisible ? 'block' : 'none',
          left: `${cursorPosition.x}px`,
          top: `${cursorPosition.y}px`,
        }}
      >
        <div className={`cursor-card-stack ${showStack ? 'has-stack' : ''}`}>
          {/* Render up to 3 cards in the stack, with the first card on top */}
          {showStack && Array.from({ length: Math.min(2, maxVisibleCards - 1) }).map((_, i) => (
            <div 
              key={`stack-${i}`}
              className={`cursor-card-element ${isRed ? 'cursor-card-red' : 'cursor-card-black'}`}
            />
          ))}
          
          {/* Main (top) card */}
          <div 
            className={`cursor-card-element ${isRed ? 'cursor-card-red' : 'cursor-card-black'}`}
          >
            {cardValue}
          </div>
          
          {/* Count badge for more than 3 cards */}
          {selectedCards.length > 3 && (
            <div className="cursor-card-count">{selectedCards.length}</div>
          )}
        </div>
      </div>
    );
  };

  // Calculate if player can stake - player is always red ('0')
  const canStake = () => {
    const isPlayersTurn = ctx.currentPlayer === '0'; // '0' corresponds to red player
    return isPlayersTurn && selectedCards.length === 1 && player?.availableStakes?.length > 0;
  };

  // Calculate if player can wager - player is always red ('0')
  const canWager = () => {
    const isPlayersTurn = ctx.currentPlayer === '0'; // '0' corresponds to red player
    return isPlayersTurn && selectedCards.length > 0 && selectedColumn !== null;
  };

  // Get card at position 
  const getCardAtPosition = (columnIndex: number, owner: 'red' | 'black') => {
    if (!G?.board?.[columnIndex]?.positions) return null;

    // For each player side, we need the row closest to the stake row that has a card
    const positions = G.board[columnIndex].positions
      .filter(p => p?.owner === owner && p?.card);
    
    if (positions.length === 0) return null;
    
    // Sort based on owner - red positions are closer to bottom, black positions closer to top
    const sortedPositions = [...positions].sort((a, b) => {
      if (owner === 'red') {
        return b.coord[0] - a.coord[0]; // Red closest to stake (lowest row number first)
      } else {
        return a.coord[0] - b.coord[0]; // Black closest to stake (highest row number first)
      }
    });
    
    // Return the card from the position closest to the stake
    return sortedPositions[0].card;
  };

  // Watch for phase changes and show messages
  useEffect(() => {
    if (ctx.phase === 'roundEnd') {
      showMessage('Round Complete! Starting next round...');
    }
  }, [ctx.phase]);
  
  // Render the grid-based board
  const renderGrid = () => {
    if (!G?.board) return null;

    // Create the grid cells
    const gridCells = [];

    // Add 5 rows for Black player (rows 1-5)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        const gridRow = row + 1; // Starting from row 1
        
        // Get the position for this exact grid cell
        const position = G.board[col]?.positions?.find(
          p => p.owner === 'black' && p.coord[0] === row
        );
        
        // Check if this position has a card
        const hasCard = position?.card !== undefined;
        
        // Check if this position is valid for wagering (Black territory)
        const canWager = selectedCards.length > 0 && 
                         position && 
                         isWagerablePosition(row, col, 'black');
        const showWagerHighlight = canWager && ctx.currentPlayer === '0';

        gridCells.push(
          <div
            key={`black-${row}-${col}`}
            className={`grid-cell black-cell 
                       ${selectedColumn === col ? 'selected-cell' : ''}
                       ${showWagerHighlight ? 'wager-highlight' : ''}`}
            style={{
              gridColumn: col + 1,
              gridRow: gridRow,
              cursor: (canWager || hasCard) ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (canWager) {
                console.log(`Trying to wager on column ${col} (Black position, row ${row})`);
                wagerCards(col);
              } else if (hasCard && G.board[col].stakedCard) {
                selectColumn(col);
              }
            }}
          >
            {hasCard && renderCardArray(position.card, true)}
            
            {/* Drop here indicator */}
            {canWager && (
              <div className="drop-here">Wager Here</div>
            )}
          </div>
        );
      }
    }

    // Add stake row (row 6)
    for (let col = 0; col < 10; col++) {
      const isAvailableForStake = player?.availableStakes?.includes(col);
      const isNextStakeForRed = currentColor === 'red' && player?.availableStakes?.length > 0 && 
        col === Math.min(...player.availableStakes);
      const isNextStakeForBlack = opponent?.availableStakes?.length > 0 && 
        col === Math.max(...opponent.availableStakes);
      const isNextStakeColumn = isNextStakeForRed || isNextStakeForBlack;
      
      // Check if this column is valid for the current selection
      const canStakeHere = selectedCards.length === 1 && isAvailableForStake;
      
      // No wagering allowed on the stake row itself
      const canWagerHere = false;
      
      const showWagerHighlight = canWagerHere && ctx.currentPlayer === '0';
      const showStakeHighlight = canStakeHere && ctx.currentPlayer === '0';
      
      gridCells.push(
        <div
          key={`stake-${col}`}
          className={`grid-cell stake-cell 
                      ${selectedColumn === col ? 'selected-cell' : ''} 
                      ${isNextStakeColumn ? 'next-stake' : ''}`}
          style={{
            gridColumn: col + 1,
            gridRow: 6,
            cursor: (canStakeHere || canWagerHere) ? 'pointer' : 'default'
          }}
          onClick={() => {
            if (canStakeHere) {
              stakeCard(col);
            } else if (G.board[col].stakedCard) {
              // Only select column for stake row, no wagering
              selectColumn(col);
            }
          }}
        >
          {G.board[col].stakedCard && renderCard(G.board[col].stakedCard)}
          {/* Drop here indicator - only for staking */}
          {canStakeHere && (
            <div className="drop-here">
              Stake Here
            </div>
          )}
        </div>
      );
    }

    // Add 5 rows for Red player (rows 7-11)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        const gridRow = row + 7; // Starting from row 7 (after stake row)
        
        // Find the actual game board row (6-10)
        const boardRow = row + 6;
        
        // Get the position for this exact grid cell
        const position = G.board[col]?.positions?.find(
          p => p.owner === 'red' && p.coord[0] === boardRow
        );
        
        // Check if this position has a card
        const hasCard = position?.card !== undefined;
        
        // Check if this position is valid for wagering (Red territory)
        const canWager = selectedCards.length > 0 && 
                         position && 
                         isWagerablePosition(boardRow, col, 'red');
        const showWagerHighlight = canWager && ctx.currentPlayer === '0';

        gridCells.push(
          <div
            key={`red-${row}-${col}`}
            className={`grid-cell red-cell 
                       ${selectedColumn === col ? 'selected-cell' : ''}
                       ${showWagerHighlight ? 'wager-highlight' : ''}`}
            style={{
              gridColumn: col + 1,
              gridRow: gridRow,
              cursor: (canWager || hasCard) ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (canWager) {
                console.log(`Trying to wager on column ${col} (Red position, row ${boardRow})`);
                wagerCards(col);
              } else if (hasCard && G.board[col].stakedCard) {
                selectColumn(col);
              }
            }}
          >
            {hasCard && renderCardArray(position.card)}
            {/* Drop here indicator */}
            {canWager && (
              <div className="drop-here">Wager Here</div>
            )}
          </div>
        );
      }
    }

    return gridCells;
  };

  // Handle showing a transition message during round end phase
  if (ctx.phase === 'roundEnd') {
    // Calculate the VP gained this round for each player
    const redVPGained = G.victoryPointScores?.red || 0;
    const blackVPGained = G.victoryPointScores?.black || 0;
    
    return (
      <div className="board">
        <div className="round-transition">
          <h2>Round Complete!</h2>
          <p>Scoring the board and preparing the next round...</p>
          
          <div style={{ marginTop: '1rem', fontSize: '1.1rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: '#cc0000', fontWeight: 'bold' }}>
                Red: {G.players.red.victory_points} VP
              </span>
              {redVPGained > 0 && 
                <span style={{ color: 'green', marginLeft: '0.5rem' }}>
                  (+{redVPGained} this round)
                </span>
              }
            </div>
            
            <div>
              <span style={{ color: '#000099', fontWeight: 'bold' }}>
                Black: {G.players.black.victory_points} VP
              </span>
              {blackVPGained > 0 && 
                <span style={{ color: 'green', marginLeft: '0.5rem' }}>
                  (+{blackVPGained} this round)
                </span>
              }
            </div>
          </div>
          
          <p style={{ marginTop: '1rem', color: '#888', fontStyle: 'italic' }}>
            {G.activePlayer === 'red' ? 'Red' : 'Black'} will go first in the next round
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="board">
      {/* Opponent info - minimal with card backs */}
      <div className="player-info" style={{ backgroundColor: '#e0e0e0' }}>
        <h3 key="opponent-title">Black - {opponent?.victory_points || 0} VP</h3>
        <div className="opponent-hand">
          {opponent?.hand && Array.from({ length: opponent.hand.length || 0 }).map((_, i) => (
            <div key={`opponent-card-${i}`} className="card-back opponent-card" />
          ))}
        </div>
      </div>

      {/* Grid-based board */}
      <div className="game-grid">
        {renderGrid()}
      </div>

      {/* Player's hand - minimal */}
      <div className="player-info" style={{ backgroundColor: '#ffe6e6' }}>
        <h3 key="player-title">Red - {player?.victory_points || 0} VP</h3>
        <div className="hand" key="player-hand">
          {renderHand()}
        </div>
      </div>

      {/* Action buttons removed - all actions done through UI */}

      {/* Minimalist game info - just show whose turn it is and messages */}
      <div className="game-info">
        <div key="active-player">
          {ctx && ctx.currentPlayer === '0' ? 'Your Turn' : 'AI\'s Turn'}
        </div>
        {message && <div key="message" style={{ color: 'red', fontWeight: 'bold', marginTop: '10px' }}>{message}</div>}
        {G?.roundState === 'complete' && <div key="round-complete" style={{ color: 'green', fontWeight: 'bold', marginTop: '10px' }}>Round Complete!</div>}
      </div>

      {/* Custom cursor for cards */}
      {renderCustomCursor()}
    </div>
  );
}
