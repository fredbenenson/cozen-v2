import React, { useState, useEffect } from 'react';
import { BoardProps } from 'boardgame.io/react';
import { CozenState, Card } from '../types/game';
import { Color } from '../types/game';

// Styles for the Cozen board
const styles = `
  .board {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 20px;
    font-family: Arial, sans-serif;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }
  .player-info {
    width: 100%;
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 5px;
    text-align: center;
  }
  .columns {
    display: flex;
    width: 100%;
    margin-bottom: 20px;
    justify-content: center;
    overflow-x: auto;
  }
  .column {
    flex: 1;
    min-width: 120px;
    width: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 1px solid #ddd;
    padding: 10px 8px;
    margin: 0 5px;
    position: relative;
    background-color: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    border-radius: 5px;
  }
  .column.selected {
    border: 2px solid #3498db;
    background-color: rgba(52, 152, 219, 0.05);
    box-shadow: 0 0 8px rgba(52, 152, 219, 0.3);
  }
  .column-header {
    text-align: center;
    margin-bottom: 10px;
    font-weight: bold;
    font-size: 14px;
    color: #555;
    background-color: #f5f5f5;
    padding: 5px 0;
    border-radius: 4px;
    width: 100%;
  }
  .positions {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    flex: 1;
    position: relative;
    min-height: 500px;
  }
  .positions-section {
    flex: 1;
    display: flex; 
    flex-direction: column;
    width: 100%;
    align-items: center;
    justify-content: flex-start;
  }
  .positions::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: #eee;
    z-index: 0;
  }
  .position {
    width: 90px;
    min-height: 100px;
    height: auto;
    margin: 5px 0;
    border: 1px dashed #999;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding: 10px 5px;
    overflow: visible;
    border-radius: 5px;
  }
  .black-pos {
    background-color: rgba(0, 0, 0, 0.05);
    position: relative;
    margin-bottom: 5px;
  }
  .black-pos::before {
    content: "B";
    position: absolute;
    top: 3px;
    left: 3px;
    font-size: 10px;
    color: #000099;
    opacity: 0.5;
  }
  .red-pos {
    background-color: rgba(255, 0, 0, 0.05);
    position: relative;
    margin-top: 5px;
  }
  .red-pos::before {
    content: "R";
    position: absolute;
    top: 3px;
    left: 3px;
    font-size: 10px;
    color: #cc0000;
    opacity: 0.5;
  }
  .stake-pos {
    background-color: rgba(255, 215, 0, 0.1);
    min-height: 100px;
    border: 1px dashed #b8860b;
    position: relative;
    border-radius: 5px;
    margin: 0;
  }
  .stake-pos::before {
    content: "S";
    position: absolute;
    top: 3px;
    left: 3px;
    font-size: 10px;
    color: #b8860b;
    font-weight: bold;
    opacity: 0.7;
  }
  .card {
    width: 60px;
    height: 85px;
    border: 2px solid #333;
    border-radius: 8px;
    position: relative;
    cursor: pointer;
    margin: 0 5px;
    background-color: white;
    box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
  }
  .card::before, .card::after {
    content: attr(data-value);
    position: absolute;
    font-weight: bold;
    font-size: 16px;
    line-height: 1;
  }
  .card::before {
    top: 3px;
    left: 3px;
  }
  .card::after {
    bottom: 3px;
    right: 3px;
    transform: rotate(180deg);
  }
  .position .card {
    width: 60px;
    height: 85px;
    font-size: 14px;
    margin-bottom: 5px;
  }
  .stake-card {
    width: 60px;
    height: 85px;
    border: 2px solid #333;
    border-radius: 8px;
    position: relative;
    font-weight: bold;
    box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
    background-color: white;
  }
  .stake-card::before, .stake-card::after {
    content: attr(data-value);
    position: absolute;
    font-weight: bold;
    font-size: 16px;
    line-height: 1;
  }
  .stake-card::before {
    top: 3px;
    left: 3px;
  }
  .stake-card::after {
    bottom: 3px;
    right: 3px;
    transform: rotate(180deg);
  }
  .wager-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: 5px 0;
    min-height: 100px;
    height: auto;
  }
  .hand {
    display: flex;
    justify-content: center;
    margin: 20px 0;
    flex-wrap: wrap;
  }
  .hand .card {
    margin: 5px;
  }
  .red-card {
    background-color: #ffeeee;
    color: #cc0000;
    border-color: #cc0000;
  }
  .black-card {
    background-color: #eeeeff;
    color: #000099;
    border-color: #000099;
  }
  .selected {
    box-shadow: 0 0 10px 3px gold;
  }
  .stake-pos.selected {
    background-color: rgba(255, 215, 0, 0.3);
    border-radius: 8px;
  }
  .actions {
    display: flex;
    justify-content: center;
    margin: 20px 0;
  }
  .button {
    padding: 10px 20px;
    margin: 0 10px;
    cursor: pointer;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
  }
  .button:hover {
    background-color: #45a049;
  }
  .button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    opacity: 0.7;
  }
  .button:not(:disabled):hover {
    background-color: #45a049;
    transform: translateY(-1px);
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }
  .game-info {
    text-align: center;
    margin-top: 20px;
    padding: 15px;
    background-color: #f8f8f8;
    border-radius: 5px;
    display: inline-block;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border: 1px solid #eee;
  }
  .game-info div {
    margin: 5px 0;
    font-size: 14px;
  }
`;

export function Board({ G, ctx, moves }: any) {
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');

  // Add styles to the document
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
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
    
    // Display debug info
    console.log("Staking card:", selectedCards[0]);
    console.log("Available stakes:", player.availableStakes);
    
    // Execute the stake move
    moves.stakeCard(selectedCards[0].id);
    
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
  
  // Create board columns display
  const renderColumns = () => {
    if (!G?.board) return null;
    
    return G.board.map((column, columnIndex) => {
      if (!column) return null;
      
      // For Cozen, we should only render a few positions
      // Based on the rules: one stake position with one position above (black) and one below (red)
      
      return (
        <div 
          key={columnIndex} 
          className={`column ${selectedColumn === columnIndex ? 'selected' : ''}`}
          onClick={() => column.stakedCard && selectColumn(columnIndex)}
        >
          <div className="column-header">Column {columnIndex}</div>
          <div className="positions">
            {/* Black player position section (top) */}
            <div className="positions-section">
              {/* Black player position (directly above stake) */}
              <div key={`${columnIndex}-black-position`} className="position black-pos">
                {/* Find any black cards played on this column */}
                {column.positions.find(p => 
                  p?.owner === 'black' && p?.card)?.card && 
                  renderPositionCard(
                    column.positions.find(p => p?.owner === 'black' && p?.card)?.card!, 
                    `${columnIndex}-black-position`
                  )
                }
              </div>
            </div>
            
            {/* Stake position (middle) */}
            <div 
              key={`stake-${columnIndex}`}
              className={`position stake-pos ${selectedColumn === columnIndex ? 'selected' : ''}`}
              onClick={() => column?.stakedCard && selectColumn(columnIndex)}
            >
              {column?.stakedCard && renderStakeCard(column.stakedCard, columnIndex)}
            </div>
            
            {/* Red player position section (bottom) */}
            <div className="positions-section">
              {/* Red player position (directly below stake) */}
              <div key={`${columnIndex}-red-position`} className="position red-pos">
                {/* Find any red cards played on this column */}
                {column.positions.find(p => 
                  p?.owner === 'red' && p?.card)?.card && 
                  renderPositionCard(
                    column.positions.find(p => p?.owner === 'red' && p?.card)?.card!, 
                    `${columnIndex}-red-position`
                  )
                }
              </div>
            </div>
          </div>
        </div>
      );
    });
  };
  
  // Render a card in a position
  const renderPositionCard = (card: Card | Card[], positionId?: string) => {
    // Check if it's an array of cards (multiple cards wagered at once)
    if (Array.isArray(card)) {
      if (card.length === 0) return null;
      
      // Show all cards in a vertical stack
      return (
        <div className="wager-container" key={`container-${positionId || 'unknown'}`}>
          {card.map((c, index) => {
            if (!c) return null;
            const cardValue = c.number?.toString() + (c.color === Color.Red ? '♦' : '♣');
            const cardKey = c.id || `${positionId}-card-${index}`;
            
            return (
              <div 
                key={cardKey}
                className={`card ${c.color === Color.Red ? 'red-card' : 'black-card'}`}
                data-value={cardValue}
                style={{ 
                  marginBottom: index < card.length - 1 ? '5px' : '0',
                  border: '2px solid',
                  borderColor: c.color === Color.Red ? '#cc0000' : '#000099',
                }}
              />
            );
          })}
        </div>
      );
    }
    
    // Single card
    if (!card) return null;
    const cardValue = card.number?.toString() + (card.color === Color.Red ? '♦' : '♣');
    const cardKey = card.id || `${positionId}-card`;
    return (
      <div 
        key={cardKey}
        className={`card ${card.color === Color.Red ? 'red-card' : 'black-card'}`}
        data-value={cardValue}
      />
    );
  };
  
  // Render a stake card
  const renderStakeCard = (card: Card, columnId?: number) => {
    if (!card) return null;
    const cardValue = card.number?.toString() + (card.color === Color.Red ? '♦' : '♣');
    const cardKey = card.id || `stake-${columnId}-card`;
    return (
      <div 
        key={cardKey}
        className={`stake-card ${card.color === Color.Red ? 'red-card' : 'black-card'}`}
        data-value={cardValue}
      />
    );
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
  
  return (
    <div className="board">
      {/* Opponent info - Always the AI/Black player */}
      <div className="player-info" style={{ backgroundColor: '#e0e0e0' }}>
        <h3 key="opponent-title">AI Player (Black) - {opponent?.victory_points || 0} VP</h3>
        <div key="opponent-hand">Cards in hand: {opponent?.hand?.length || 0}</div>
        <div key="opponent-stakes">Stakes available: {opponent?.availableStakes?.join(', ') || 'None'}</div>
      </div>
      
      {/* Board columns with integrated stake positions */}
      <div className="columns">
        {renderColumns()}
      </div>
      
      {/* Player's hand - Always the human/Red player */}
      <div className="player-info" style={{ backgroundColor: '#ffe6e6' }}>
        <h3 key="player-title">You (Red) - {player?.victory_points || 0} VP</h3>
        <div className="hand" key="player-hand">
          {renderHand()}
        </div>
        <div key="player-stakes" style={{ marginTop: '10px' }}>Stakes available: {player?.availableStakes?.join(', ') || 'None'}</div>
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