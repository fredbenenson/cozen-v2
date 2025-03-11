import { INVALID_MOVE } from 'boardgame.io/core';
import { Game } from 'boardgame.io';
import { Client } from 'boardgame.io/client';

// Simplest possible game state
interface SimpleState {
  hand: { id: string; value: number }[];
  activePlayer: 'red' | 'black';
}

// Simple game definition
const SimpleGame: Game = {
  name: 'simple-game',
  
  setup: ({ ctx }: { ctx: any }) => ({
    hand: [
      { id: 'card1', value: 1 },
      { id: 'card2', value: 2 },
      { id: 'card3', value: 3 },
    ],
    activePlayer: 'red',
  }),
  
  moves: {
    playCard: ({ G, ctx }, cardId: string) => {
      console.log(`Player ${ctx.currentPlayer} playing card ${cardId}`);
      
      // Find the card
      const cardIndex = G.hand.findIndex((c: any) => c.id === cardId);
      if (cardIndex === -1) {
        console.log(`Card ${cardId} not found`);
        return INVALID_MOVE;
      }
      
      // Remove the card from hand
      const newHand = [...G.hand];
      newHand.splice(cardIndex, 1);
      
      // Return the new state
      return {
        ...G,
        hand: newHand,
        activePlayer: G.activePlayer === 'red' ? 'black' : 'red'
      };
    }
  },
  
  turn: {
    moveLimit: 1,
  }
};

// Run a simple test
function runSimpleTest() {
  // Create a client for the simple game
  const client = Client({
    game: SimpleGame,
    numPlayers: 2,
    playerID: '0',
  });

  // Start the client
  client.start();

  // Get initial state
  const state = client.getState();
  if (!state) {
    console.error('Failed to get state');
    return false;
  }

  // Print initial state
  console.log('Initial state:');
  console.log(JSON.stringify(state.G, null, 2));

  // Make a move
  console.log('\nMaking a move...');
  client.moves.playCard('card1');

  // Get the state after the move
  const afterState = client.getState();
  if (!afterState) {
    console.error('Failed to get state after move');
    return false;
  }

  // Print the state after the move
  console.log('\nState after move:');
  console.log(JSON.stringify(afterState.G, null, 2));

  console.log('\nTest completed successfully');
  return true;
}

// Run the test
console.log('Running simple game test...');
runSimpleTest();