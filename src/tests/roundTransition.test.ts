import { CozenGame } from '../game/CozenGame';
import { Card, Color, Suit } from '../types/game';
import { Client } from 'boardgame.io/client';

describe('Round Transitions', () => {
  let client: any;

  beforeEach(() => {
    // Create a single test client
    client = Client({
      game: CozenGame,
    });

    // Start the game
    client.start();
  });

  afterEach(() => {
    client.stop();
  });

  // This test just verifies that round transitions happen properly without checking
  // specific details that might change as the game evolves
  test('should handle round transitions correctly', () => {
    // Record initial state
    const initialState = client.getState().G;
    const initialPhase = client.getState().ctx.phase;
    const initialTurnNumber = client.getState().ctx.turn;
    
    // Start a round transition
    client.events.setPhase('roundEnd');
    
    // Get the state after transition
    const newState = client.getState().G;
    const newPhase = client.getState().ctx.phase;
    
    // Verify phase transitions back to play
    expect(newPhase).toBe('play');
    
    // Verify round state is set to running
    expect(newState.roundState).toBe('running');
    
    // Verify players have cards in hand
    expect(newState.players.red.hand.length).toBeGreaterThan(0);
    expect(newState.players.black.hand.length).toBeGreaterThan(0);
    
    // Verify at least one stake exists on the board
    const hasStakes = newState.board.some(col => col.stakedCard);
    expect(hasStakes).toBe(true);
    
    // Verify turn number has increased
    expect(client.getState().ctx.turn).toBeGreaterThan(initialTurnNumber);
  });
  
  test('should handle multiple round transitions', () => {
    // Go through multiple round transitions
    for (let i = 0; i < 3; i++) {
      // Force round transition
      client.events.setPhase('roundEnd');
      
      // Get state after each transition
      const state = client.getState().G;
      
      // Verify round is in running state
      expect(state.roundState).toBe('running');
      
      // Verify players have cards
      expect(state.players.red.hand.length).toBeGreaterThan(0);
      expect(state.players.black.hand.length).toBeGreaterThan(0);
    }
  });
});