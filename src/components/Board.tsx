import React, { useState, useEffect } from 'react';
import { BoardProps } from 'boardgame.io/react';
import { CozenState, Card } from '../types/game';
import { Color } from '../types/game';
import './Board.css';
import { enableGameLogging } from '../game/CozenGame';

export function Board({ G, ctx, moves }: any) {
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  
  // Enable game logging once the board component mounts
  // This way, AI's initial moves won't flood the console
  useEffect(() => {
    // Wait a short time to ensure all initial AI calculations are done
    const timer = setTimeout(() => {
      enableGameLogging();
      console.log('Game logging enabled');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Always set the human player to Red and the AI to Black for consistent UI
  // Note: playerID is "0" for first player, "1" for second player
  const currentColor = 'red';  // Human player is always red
  const opponentColor = 'black'; // AI/opponent is always black

  const player = G.players[currentColor];
  const opponent = G.players[opponentColor];

  // Show message
  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // Get next available stake column - player is always red
  const getNextStakeColumn = (): number | undefined => {
    if (player.availableStakes.length === 0) return undefined;

    // Always use the Red staking pattern since player is always Red
    // Red stakes columns from left to right (5, 6, 7, 8, 9)
    return player.availableStakes.sort((a, b) => a - b)[0];
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
  const stakeCard = () => {
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
    const nextStakeColumn = Math.min(...player.availableStakes);

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
  const wagerCards = () => {
    if (ctx.currentPlayer !== '0') { // Player is always red ('0')
      showMessage("It's not your turn!");
      return;
    }

    if (selectedCards.length === 0) {
      showMessage('You must select at least one card to wager.');
      return;
    }

    if (selectedColumn === null) {
      showMessage('You must select a column to wager on.');
      return;
    }

    // Display debug info
    console.log("Wagering cards:", selectedCards);
    console.log("Selected column:", selectedColumn);

    // Execute the wager move
    moves.wagerCards(selectedCards.map(c => c.id), selectedColumn);

    // Reset selections
    setSelectedCards([]);
    setSelectedColumn(null);
  };

  // Render a card
  const renderCard = (card: Card | null) => {
    if (!card) return null;
    const cardValue = card.number?.toString() + (card.color === Color.Red ? '♦' : '♣');
    return (
      <div
        key={card.id}
        className={`card ${card.color === Color.Red ? 'red-card' : 'black-card'}`}
        data-value={cardValue}
      />
    );
  };

  // Render an array of cards (for wagers)
  const renderCardArray = (cards: Card[]) => {
    if (!cards || cards.length === 0) return null;
    // Just show the top card for simplicity in the grid view
    return renderCard(cards[0]);
  };

  // Render player hand
  const renderHand = () => {
    if (!player?.hand) return null;

    return player.hand.map(card => {
      if (!card) return null;
      const cardValue = card.number?.toString() + (card.color === Color.Red ? '♦' : '♣');
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

    const position = G.board[columnIndex].positions.find(p => p?.owner === owner);
    if (!position?.card) return null;

    return position.card;
  };

  // Render the grid-based board
  const renderGrid = () => {
    if (!G?.board) return null;

    // Create the grid cells
    const gridCells = [];

    // Add 5 rows for Black player (rows 1-5)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        const isBlackCard = row === 4; // Cards only in bottom row for Black
        const gridRow = row + 1; // Starting from row 1

        gridCells.push(
          <div
            key={`black-${row}-${col}`}
            className={`grid-cell black-cell ${selectedColumn === col ? 'selected-cell' : ''}`}
            style={{
              gridColumn: col + 1,
              gridRow: gridRow
            }}
            onClick={() => isBlackCard && G.board[col].stakedCard && selectColumn(col)}
          >
            {isBlackCard && renderCardArray(getCardAtPosition(col, 'black') as Card[])}
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

      gridCells.push(
        <div
          key={`stake-${col}`}
          className={`grid-cell stake-cell ${selectedColumn === col ? 'selected-cell' : ''} 
                      ${isAvailableForStake ? 'available-stake' : ''}
                      ${isNextStakeColumn ? 'next-stake' : ''}`}
          style={{
            gridColumn: col + 1,
            gridRow: 6
          }}
          onClick={() => G.board[col].stakedCard && selectColumn(col)}
        >
          {G.board[col].stakedCard && renderCard(G.board[col].stakedCard)}
        </div>
      );
    }

    // Add 5 rows for Red player (rows 7-11)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        const isRedCard = row === 0; // Cards only in top row for Red
        const gridRow = row + 7; // Starting from row 7 (after stake row)

        gridCells.push(
          <div
            key={`red-${row}-${col}`}
            className={`grid-cell red-cell ${selectedColumn === col ? 'selected-cell' : ''}`}
            style={{
              gridColumn: col + 1,
              gridRow: gridRow
            }}
            onClick={() => isRedCard && G.board[col].stakedCard && selectColumn(col)}
          >
            {isRedCard && renderCardArray(getCardAtPosition(col, 'red') as Card[])}
          </div>
        );
      }
    }

    return gridCells;
  };

  return (
    <div className="board">
      {/* Opponent info - Always the AI/Black player */}
      <div className="player-info" style={{ backgroundColor: '#e0e0e0' }}>
        <h3 key="opponent-title">AI Player (Black) - {opponent?.victory_points || 0} VP</h3>
        <div key="opponent-hand">Cards in hand: {opponent?.hand?.length || 0}</div>
        <div key="opponent-stakes">
          Stakes available: {opponent?.availableStakes?.join(', ') || 'None'}
          {opponent?.availableStakes?.length > 0 && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Black stakes columns 0-4, right-to-left from center
            </div>
          )}
        </div>
      </div>

      {/* Grid-based board */}
      <div className="game-grid">
        {renderGrid()}
      </div>

      {/* Player's hand - Always the human/Red player */}
      <div className="player-info" style={{ backgroundColor: '#ffe6e6' }}>
        <h3 key="player-title">You (Red) - {player?.victory_points || 0} VP</h3>
        <div className="hand" key="player-hand">
          {renderHand()}
        </div>
        <div key="player-stakes" style={{ marginTop: '10px' }}>
          Stakes available: {player?.availableStakes?.join(', ') || 'None'}
          {player?.availableStakes?.length > 0 && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Red stakes columns 5-9, left-to-right from center
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="actions">
        <button
          key="stake-button"
          className="button"
          onClick={stakeCard}
          disabled={!canStake()}
        >
          Stake Card
        </button>
        <button
          key="wager-button"
          className="button"
          onClick={wagerCards}
          disabled={!canWager()}
        >
          Wager Cards
        </button>
      </div>

      {/* Game info */}
      <div className="game-info">
        <div key="active-player">
          Active Player: {ctx.currentPlayer === '0' ? 'Your Turn (Red)' : 'AI\'s Turn (Black)'}
        </div>
        <div key="round-state">Round State: {G?.roundState || 'UNKNOWN'}</div>
        <div key="turn-count">Turn: {G?.turnCount || 0}</div>
        {message && <div key="message" style={{ color: 'red', fontWeight: 'bold', marginTop: '10px' }}>{message}</div>}
      </div>
    </div>
  );
}
