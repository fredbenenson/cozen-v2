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
    max-width: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 1px solid #ddd;
    padding: 10px;
    margin: 0 5px;
    min-height: 600px;
    position: relative;
    background-color: white;
  }
  .column.selected {
    border: 2px solid blue;
  }
  .column-header {
    text-align: center;
    margin-bottom: 10px;
    font-weight: bold;
  }
  .positions {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    flex: 1;
  }
  .position {
    width: 70px;
    height: 100px;
    margin: 2px 0;
    border: 1px dashed #999;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: visible;
  }
  .black-pos {
    background-color: rgba(0, 0, 0, 0.05);
  }
  .red-pos {
    background-color: rgba(255, 0, 0, 0.05);
  }
  .stake-pos {
    background-color: rgba(255, 215, 0, 0.1);
    height: 100px;
  }
  .card {
    width: 70px;
    height: 100px;
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
    height: 80px;
    font-size: 14px;
  }
  .stake-card {
    width: 70px;
    height: 100px;
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
    position: relative;
    height: 100px;
    width: 100px;
    margin: 0 auto;
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
  }
  .game-info {
    text-align: center;
    margin-top: 20px;
    padding: 10px;
    background-color: #e8f5e9;
    border-radius: 5px;
    display: inline-block;
  }
`;

export function EnhancedBoard({ G, ctx, moves }: any) {
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
  
  // Get current player colors
  const playerID = ctx.playerID as 'red' | 'black';
  const currentColor = playerID; // playerID should already be 'red' or 'black'
  const opponentColor = currentColor === 'red' ? 'black' : 'red';
  
  const player = G.players[currentColor];
  const opponent = G.players[opponentColor];
  
  // Show message
  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };
  
  // Get next available stake column
  const getNextStakeColumn = (): number | undefined => {
    if (player.availableStakes.length === 0) return undefined;
    
    if (currentColor === 'black') {
      // Black stakes columns from right to left (4, 3, 2, 1, 0)
      return player.availableStakes.sort((a, b) => b - a)[0];
    } else {
      // Red stakes columns from left to right (5, 6, 7, 8, 9)
      return player.availableStakes.sort((a, b) => a - b)[0];
    }
  };
  
  // Toggle card selection
  const toggleCardSelection = (card: Card) => {
    if (ctx.currentPlayer !== currentColor) {
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
    if (ctx.currentPlayer !== currentColor) {
      showMessage("It's not your turn!");
      return;
    }
    
    if (!G.board[columnIndex].stakedCard) {
      showMessage("Can't select a column without a stake card!");
      return;
    }
    
    setSelectedColumn(columnIndex === selectedColumn ? null : columnIndex);
  };
  
  // Stake a card
  const stakeCard = () => {
    if (ctx.currentPlayer !== currentColor) {
      showMessage("It's not your turn!");
      return;
    }
    
    if (selectedCards.length !== 1) {
      showMessage('You must select exactly one card to stake.');
      return;
    }
    
    if (player.availableStakes.length === 0) {
      showMessage('No available columns to stake!');
      return;
    }
    
    moves.stakeCard(selectedCards[0].id);
    setSelectedCards([]);
    setSelectedColumn(null);
  };
  
  // Wager cards
  const wagerCards = () => {
    if (ctx.currentPlayer !== currentColor) {
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
    
    moves.wagerCards(selectedCards.map(c => c.id), selectedColumn);
    setSelectedCards([]);
    setSelectedColumn(null);
  };
  
  // Create board columns display
  const renderColumns = () => {
    return G.board.map((column, columnIndex) => (
      <div 
        key={columnIndex} 
        className={`column ${selectedColumn === columnIndex ? 'selected' : ''}`}
        onClick={() => column.stakedCard && selectColumn(columnIndex)}
      >
        <div className="column-header">Column {columnIndex}</div>
        <div className="positions">
          {/* Black player positions (top) */}
          {column.positions.filter(p => p.owner === 'black').map((position, idx) => (
            <div key={`black-${idx}`} className="position black-pos">
              {position.card && renderPositionCard(position.card)}
            </div>
          ))}
          
          {/* Stake position (middle) */}
          <div className="position stake-pos">
            {column.stakedCard && renderStakeCard(column.stakedCard)}
          </div>
          
          {/* Red player positions (bottom) */}
          {column.positions.filter(p => p.owner === 'red').map((position, idx) => (
            <div key={`red-${idx}`} className="position red-pos">
              {position.card && renderPositionCard(position.card)}
            </div>
          ))}
        </div>
      </div>
    ));
  };
  
  // Render a card in a position
  const renderPositionCard = (card: Card | Card[]) => {
    // Check if it's an array of cards (multiple cards wagered at once)
    if (Array.isArray(card)) {
      if (card.length === 0) return null;
      
      // Create a stacked card container
      return (
        <div className="wager-container">
          {card.map((c, index) => {
            const cardValue = c.number.toString() + (c.color === Color.Red ? '♦' : '♣');
            return (
              <div 
                key={c.id || index}
                className={`card ${c.color === Color.Red ? 'red-card' : 'black-card'}`}
                data-value={cardValue}
                style={{
                  position: 'absolute',
                  top: `${index * 25}px`,
                  left: '0px',
                  zIndex: index
                }}
              />
            );
          })}
        </div>
      );
    }
    
    // Single card
    const cardValue = card.number.toString() + (card.color === Color.Red ? '♦' : '♣');
    return (
      <div 
        className={`card ${card.color === Color.Red ? 'red-card' : 'black-card'}`}
        data-value={cardValue}
      />
    );
  };
  
  // Render a stake card
  const renderStakeCard = (card: Card) => {
    const cardValue = card.number.toString() + (card.color === Color.Red ? '♦' : '♣');
    return (
      <div 
        className={`stake-card ${card.color === Color.Red ? 'red-card' : 'black-card'}`}
        data-value={cardValue}
      />
    );
  };
  
  // Render player hand
  const renderHand = () => {
    return player.hand.map(card => {
      const cardValue = card.number.toString() + (card.color === Color.Red ? '♦' : '♣');
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
  
  // Calculate if player can stake
  const canStake = () => {
    const isPlayersTurn = ctx.currentPlayer === currentColor;
    return isPlayersTurn && selectedCards.length === 1 && player.availableStakes.length > 0;
  };
  
  // Calculate if player can wager
  const canWager = () => {
    const isPlayersTurn = ctx.currentPlayer === currentColor;
    return isPlayersTurn && selectedCards.length > 0 && selectedColumn !== null;
  };
  
  return (
    <div className="board">
      {/* Opponent info */}
      <div className="player-info" style={{ backgroundColor: opponentColor === 'red' ? '#ffe6e6' : '#e0e0e0' }}>
        <h3>{opponentColor.charAt(0).toUpperCase() + opponentColor.slice(1)} Player ({opponent.victory_points} VP)</h3>
        <div>Cards in hand: {opponent.hand.length}</div>
        <div>Stakes available: {opponent.availableStakes.join(', ')}</div>
      </div>
      
      {/* Board columns */}
      <div className="columns">
        {renderColumns()}
      </div>
      
      {/* Player's hand */}
      <div className="player-info" style={{ backgroundColor: currentColor === 'red' ? '#ffe6e6' : '#e0e0e0' }}>
        <h3>{currentColor.charAt(0).toUpperCase() + currentColor.slice(1)} Player (You) - {player.victory_points} VP</h3>
        <div className="hand">
          {renderHand()}
        </div>
        <div style={{ marginTop: '10px' }}>Stakes available: {player.availableStakes.join(', ')}</div>
      </div>
      
      {/* Action buttons */}
      <div className="actions">
        <button 
          className="button" 
          onClick={stakeCard}
          disabled={!canStake()}
        >
          Stake Card
        </button>
        <button 
          className="button" 
          onClick={wagerCards}
          disabled={!canWager()}
        >
          Wager Cards
        </button>
      </div>
      
      {/* Game info */}
      <div className="game-info">
        <div>ACTIVE PLAYER: {G.activePlayer.toUpperCase()}</div>
        <div>Round State: {G.roundState}</div>
        <div>Turn: {G.turnCount}</div>
        {message && <div style={{ color: 'red', fontWeight: 'bold', marginTop: '10px' }}>{message}</div>}
      </div>
    </div>
  );
}