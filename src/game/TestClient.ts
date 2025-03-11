import { Client } from 'boardgame.io/client';
import { CozenGame } from './CozenGame';
import { CozenState, Card } from '../types/game';
import { Color } from '../types/game';

// Create a simple client for console testing
const client = Client({
  game: CozenGame,
  numPlayers: 2,
  playerID: '0', // Start as red player
  debug: true, // Enable debug info
});

// Start the client
client.start();

// Function to print the board in a readable format
function printBoard(G: CozenState) {
  console.log('\nBoard State:');
  console.log('-'.repeat(50));
  
  // Print player info
  console.log('Red Player:');
  console.log(`  Hand: ${G.players.red.hand.map((c: any) => {
    // Handle hidden cards from playerView filtering
    if (!c.number || !c.suit) return 'Hidden';
    return `${c.number}${c.suit[0]}`;
  }).join(', ')}`);
  console.log(`  Victory Points: ${G.players.red.victory_points}`);
  
  console.log('Black Player:');
  console.log(`  Hand: ${G.players.black.hand.map((c: any) => {
    // Handle hidden cards from playerView filtering
    if (!c.number || !c.suit) return 'Hidden';
    return `${c.number}${c.suit[0]}`;
  }).join(', ')}`);
  console.log(`  Victory Points: ${G.players.black.victory_points}`);
  
  console.log('\nStakes:');
  G.board.forEach((column, i) => {
    if (column.stakedCard) {
      console.log(`  Column ${i}: ${column.stakedCard.number}${column.stakedCard.suit[0]} (${column.stakedCard.color})`);
    }
  });
  
  console.log('\nActive Player:', G.activePlayer);
  console.log('Round State:', G.roundState);
  console.log('Available Stakes for Red:', G.players.red.availableStakes.join(', '));
  console.log('Available Stakes for Black:', G.players.black.availableStakes.join(', '));
  console.log('-'.repeat(50));
}

// Run a deeper diagnostic on game state
function runDiagnostics() {
  const state = client.getState();
  if (!state) return;

  console.log('\nGAME STATE DIAGNOSTICS:');
  console.log('-'.repeat(50));
  console.log('Current Phase:', state.ctx.phase);
  console.log('Current Player:', state.ctx.currentPlayer);
  console.log('Red player available stakes:', state.G.players.red.availableStakes);
  console.log('Black player available stakes:', state.G.players.black.availableStakes);
  console.log('-'.repeat(50));
}

// Example: Make a move with error catching
function makeMove(playerID: string, moveName: string, ...args: any[]) {
  // Set client's playerID
  client.playerID = playerID === 'red' ? '0' : '1';
  
  console.log(`Attempting move: ${moveName}(${args.map((a: any) => JSON.stringify(a)).join(', ')})`);
  
  try {
    // Make the move
    client.moves[moveName](...args);
    
    // Get updated state
    const newState = client.getState();
    if (newState) {
      console.log(`\nAfter ${playerID} plays ${moveName}:`);
      printBoard(newState.G);
      return newState.G;
    }
  } catch (err) {
    console.error('Error making move:', err);
  }
  
  return null;
}

// Test move validity specifically
function testMoveValidity() {
  const state = client.getState();
  if (!state) return;
  
  console.log("\nTesting move validity for current player...");
  
  // Check who's the current player
  console.log("Current player:", state.ctx.currentPlayer);
  
  // Check if we need to change the active player
  if (state.G.activePlayer !== (state.ctx.currentPlayer === '0' ? 'red' : 'black')) {
    console.log("Game active player doesn't match boardgame.io current player!");
    console.log(`Game active player: ${state.G.activePlayer}`);
    console.log(`boardgame.io current player: ${state.ctx.currentPlayer === '0' ? 'red' : 'black'}`);
  }
  
  // Get the player for the current client
  const currentPlayerID = client.playerID;
  const playerColor = currentPlayerID === '0' ? 'red' : 'black';
  const player = state.G.players[playerColor];
  
  console.log(`Player ${playerColor} available stakes:`, player.availableStakes);
  
  // Show the player's hand (only works if we're looking at our own hand)
  const visibleCards = player.hand.filter((c: any) => c.number && c.suit);
  
  if (visibleCards.length > 0) {
    console.log(`Player ${playerColor} has ${visibleCards.length} visible cards`);
    
    // Try staking the first card
    const cardToStake = visibleCards[0];
    console.log(`Trying to stake card: ${cardToStake.number}${cardToStake.suit[0]} (ID: ${cardToStake.id})`);
    
    // Check if the active player matches
    if (playerColor !== state.G.activePlayer) {
      console.log("ERROR: Not this player's turn");
      console.log("This is " + state.G.activePlayer + "'s turn");
      
      // Switch to active player
      client.playerID = state.G.activePlayer === 'red' ? '0' : '1';
      console.log("Switching to " + state.G.activePlayer + " player");
      
      // Get the new state
      const updatedState = client.getState();
      if (!updatedState) return;
      
      // Now try again
      console.log("Testing move with active player...");
      const activePlayerColor = state.G.activePlayer;
      const activePlayer = updatedState.G.players[activePlayerColor];
      
      // Check if we can see the cards now
      const activePlayerVisibleCards = activePlayer.hand.filter((c: any) => c.number && c.suit);
      
      if (activePlayerVisibleCards.length > 0) {
        const activePlayerCardToStake = activePlayerVisibleCards[0];
        console.log(`Trying to stake ${activePlayerColor} card: ${activePlayerCardToStake.number}${activePlayerCardToStake.suit[0]}`);
        
        if (activePlayer.availableStakes.length > 0) {
          // Try the move
          client.moves.stakeCard(activePlayerCardToStake.id);
          
          // Check if move was successful
          const newState = client.getState();
          if (newState) {
            console.log('\nAfter staking:');
            printBoard(newState.G);
          }
        } else {
          console.log(`No available stakes for ${activePlayerColor} player`);
        }
      } else {
        console.log(`Cannot see ${activePlayerColor} player's cards`);
      }
    } else {
      // We are the active player, try the move
      if (player.availableStakes.length > 0) {
        // Try the move
        client.moves.stakeCard(cardToStake.id);
        
        // Check if move was successful
        const newState = client.getState();
        if (newState) {
          console.log('\nAfter staking:');
          printBoard(newState.G);
        }
      } else {
        console.log("No available stakes for this player");
      }
    }
  } else {
    console.log(`Cannot see ${playerColor} player's cards - try switching player`);
    
    // Try switching to the other player
    const otherPlayerID = currentPlayerID === '0' ? '1' : '0';
    client.playerID = otherPlayerID;
    console.log(`Switching to player ${otherPlayerID}`);
    
    // Get the new state
    const newState = client.getState();
    if (!newState) return;
    
    const newPlayerColor = otherPlayerID === '0' ? 'red' : 'black';
    const newPlayer = newState.G.players[newPlayerColor];
    
    // Check if we can see the cards now
    const newVisibleCards = newPlayer.hand.filter((c: any) => c.number && c.suit);
    
    if (newVisibleCards.length > 0) {
      console.log(`Player ${newPlayerColor} has ${newVisibleCards.length} visible cards`);
      
      // Continue with testing...
      // (similar logic to above)
    } else {
      console.log(`Still cannot see cards - may need to modify the playerView`);
    }
  }
}

// Run diagnostics
console.log('Initial game state:');
const initialState = client.getState();
if (initialState && initialState.G) {
  printBoard(initialState.G);
} else {
  console.log('No initial state available');
}
runDiagnostics();

// Run a simple test that will work
console.log("\nRUNNING SIMPLE MOVE TEST");

// Make sure we are using the active player
const state = client.getState();
if (state) {
  const activePlayerColor = state.G.activePlayer;
  client.playerID = activePlayerColor === 'red' ? '0' : '1';
  console.log(`Using player: ${client.playerID} (${activePlayerColor})`);
  
  // Get the updated state with the correct player
  const updatedState = client.getState();
  if (updatedState) {
    const player = updatedState.G.players[activePlayerColor];
    const card = player.hand[0]; // Just take first card
    
    if (card && card.id && card.number && card.suit && player.availableStakes.length > 0) {
      console.log(`Staking card: ${card.number}${card.suit[0]}`);
      client.moves.stakeCard(card.id);
      
      const finalState = client.getState();
      if (finalState) {
        console.log("\nFinal state after move:");
        printBoard(finalState.G);
      }
    } else {
      console.log("Cannot find a valid card to stake");
    }
  }
}

// Export for use in other files
export {
  client,
  makeMove,
  printBoard,
  runDiagnostics
};