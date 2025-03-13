import React from 'react';
import { Card, Position, CozenState } from '../types/game';
import { CardComponent } from './CardComponent';
import { CardArrayComponent } from './CardArrayComponent';

interface GridCellComponentProps {
  row: number;
  col: number;
  position?: Position;
  G: {
    board: Array<{
      stakedCard?: Card;
      positions?: Position[];
    }>;
    players: {
      red: {
        availableStakes?: number[];
      };
    };
  };
  selectedColumn: number | null;
  selectedCards: Card[];
  canWager: boolean;
  showWagerHighlight: boolean;
  hasCard: boolean;
  showOpponentCards: boolean;
  cellType: 'red' | 'black' | 'stake';
  handleClick: () => void;
}

export const GridCellComponent = ({ 
  row, 
  col, 
  position, 
  G, 
  selectedColumn, 
  selectedCards, 
  canWager, 
  showWagerHighlight, 
  hasCard, 
  showOpponentCards, 
  cellType, 
  handleClick 
}: GridCellComponentProps) => {
  // Determine row for grid positioning
  let gridRow = row;
  if (cellType === 'red') gridRow += 7;
  else if (cellType === 'black') gridRow += 1;
  else gridRow = 6; // stake row
  
  // Additional classes for stake row
  let additionalClasses = '';
  let canStakeHere = false;
  if (cellType === 'stake') {
    const availableStakes = G.players.red?.availableStakes || [];
    const isAvailableForStake = availableStakes.includes(col);
    const isNextStakeColumn = isAvailableForStake && availableStakes.length > 0 && 
      col === Math.min(...availableStakes);
    
    additionalClasses = isNextStakeColumn ? 'next-stake' : '';
    canStakeHere = selectedCards.length === 1 && (isAvailableForStake || false);
  }
  
  return (
    <div
      key={`${cellType}-${row}-${col}`}
      className={`grid-cell ${cellType}-cell 
                 ${selectedColumn === col ? 'selected-cell' : ''}
                 ${showWagerHighlight ? 'wager-highlight' : ''}
                 ${additionalClasses}`}
      style={{
        gridColumn: col + 1,
        gridRow: gridRow,
        cursor: (canWager || hasCard || canStakeHere) ? 'pointer' : 'default'
      }}
      onClick={handleClick}
    >
      {cellType === 'stake' 
        ? G.board[col]?.stakedCard && <CardComponent card={G.board[col].stakedCard} />
        : hasCard && <CardArrayComponent cards={position?.card} showBack={cellType === 'black'} showOpponentCards={showOpponentCards} />
      }
      
      {canWager && <div className="drop-here">Wager Here</div>}
      {canStakeHere && <div className="drop-here">Stake Here</div>}
    </div>
  );
};