import React, { useState } from 'react';
import { BoardProps } from 'boardgame.io/react';
import { CozenState, Card } from '../types/game';
import { Color } from '../types/game';

// CSS styles would be in a separate file in a real implementation
const styles = {
  board: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    margin: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  playerInfo: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    backgroundColor: '#f0f0f0',
    borderRadius: '5px',
  },
  columns: {
    display: 'flex',
    width: '100%',
    marginBottom: '20px',
  },
  column: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    border: '1px solid #ddd',
    padding: '5px',
    margin: '0 5px',
    minHeight: '400px',
    position: 'relative' as const,
  },
  stake: {
    width: '50px',
    height: '80px',
    border: '2px solid #333',
    borderRadius: '5px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '20px',
  },
  positions: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    width: '100%',
    flex: '1',
  },
  position: {
    width: '50px',
    height: '40px',
    margin: '2px',
    border: '1px dashed #999',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '50px',
    height: '80px',
    border: '2px solid #333',
    borderRadius: '5px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '20px',
    cursor: 'pointer',
    margin: '0 5px',
  },
  hand: {
    display: 'flex',
    justifyContent: 'center',
    margin: '20px 0',
  },
  selectedCard: {
    boxShadow: '0 0 10px blue',
  },
  redCard: {
    backgroundColor: '#ffcccc',
    color: '#ff0000',
  },
  blackCard: {
    backgroundColor: '#cccccc',
    color: '#000000',
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    margin: '10px 0',
  },
  button: {
    padding: '8px 16px',
    margin: '0 10px',
    cursor: 'pointer',
  },
};

export function CozenBoard({ G, ctx, moves }: any) {
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  
  const currentPlayer = ctx.currentPlayer as 'red' | 'black';
  const player = G.players[currentPlayer];
  const opponent = G.players[currentPlayer === 'red' ? 'black' : 'red'];
  
  // Toggle card selection
  const toggleCardSelection = (card: Card) => {
    if (selectedCards.some(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };
  
  // Select a column
  const selectColumn = (columnIndex: number) => {
    setSelectedColumn(columnIndex);
  };
  
  // Stake a card
  const stakeCard = () => {
    if (selectedCards.length !== 1) {
      alert('You must select exactly one card to stake.');
      return;
    }
    
    moves.stakeCard(selectedCards[0].id);
    setSelectedCards([]);
    setSelectedColumn(null);
  };
  
  // Wager cards
  const wagerCards = () => {
    if (selectedCards.length === 0) {
      alert('You must select at least one card to wager.');
      return;
    }
    
    if (selectedColumn === null) {
      alert('You must select a column to wager on.');
      return;
    }
    
    moves.wagerCards(selectedCards.map(c => c.id), selectedColumn);
    setSelectedCards([]);
    setSelectedColumn(null);
  };
  
  return (
    <div style={styles.board}>
      {/* Opponent info */}
      <div style={styles.playerInfo}>
        <h3>Opponent ({opponent.victory_points} VP)</h3>
        <div>Cards in hand: {opponent.hand.length}</div>
      </div>
      
      {/* Board columns */}
      <div style={styles.columns}>
        {G.board.map((column, columnIndex) => (
          <div 
            key={columnIndex} 
            style={{
              ...styles.column,
              ...(selectedColumn === columnIndex ? { borderColor: 'blue', borderWidth: '2px' } : {})
            }}
            onClick={() => column.stakedCard && selectColumn(columnIndex)}
          >
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              Column {columnIndex}
            </div>
            
            {/* Stake card */}
            {column.stakedCard && (
              <div 
                style={{
                  ...styles.stake,
                  ...(column.stakedCard.color === Color.Red ? styles.redCard : styles.blackCard)
                }}
              >
                {column.stakedCard.number}
              </div>
            )}
            
            {/* Positions */}
            <div style={styles.positions}>
              {column.positions.map((position, posIndex) => (
                <div 
                  key={posIndex} 
                  style={{
                    ...styles.position,
                    backgroundColor: position.owner === 'red' ? '#ffeeee' : '#eeeeee'
                  }}
                >
                  {position.card && (
                    <div style={{
                      ...styles.card,
                      width: '40px',
                      height: '60px',
                      ...(position.card.color === Color.Red ? styles.redCard : styles.blackCard)
                    }}>
                      {position.card.number}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Player's hand */}
      <div style={styles.playerInfo}>
        <h3>Your Hand ({player.victory_points} VP)</h3>
        <div style={styles.hand}>
          {player.hand.map(card => (
            <div 
              key={card.id} 
              style={{
                ...styles.card,
                ...(card.color === Color.Red ? styles.redCard : styles.blackCard),
                ...(selectedCards.some(c => c.id === card.id) ? styles.selectedCard : {})
              }}
              onClick={() => toggleCardSelection(card)}
            >
              {card.number}
            </div>
          ))}
        </div>
      </div>
      
      {/* Action buttons */}
      <div style={styles.actions}>
        <button 
          style={styles.button} 
          onClick={stakeCard}
          disabled={selectedCards.length !== 1 || player.availableStakes.length === 0}
        >
          Stake Card
        </button>
        <button 
          style={styles.button} 
          onClick={wagerCards}
          disabled={selectedCards.length === 0 || selectedColumn === null}
        >
          Wager Cards
        </button>
      </div>
      
      {/* Game info */}
      <div>
        <div>Round State: {G.roundState}</div>
        <div>Active Player: {G.activePlayer}</div>
        <div>Turn: {G.turnCount}</div>
      </div>
    </div>
  );
}