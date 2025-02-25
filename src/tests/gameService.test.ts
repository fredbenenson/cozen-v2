// src/tests/gameService.test.ts
import { GameService } from "../services/gameService";
import { RoundService } from "../services/round";
import { Color, Move, Suit } from "../types/game"; // Add Suit import
import { Player } from "../types/player";
import { createMockUser } from "./utils/mockMongoose";
import { Types } from "mongoose";
import { PlayerFactory } from "../factories/PlayerFactory"; // Add this import

describe("GameService", () => {
  it("should initialize a new game correctly", () => {
    const user1 = createMockUser({ color: Color.Red });
    const user2 = createMockUser({ color: Color.Black });

    const game = GameService.initializeGame(user1, user2);

    expect(game.players).toHaveLength(2);
    expect(game.players[0].toString()).toBe(user1._id.toString());
    expect(game.players[1].toString()).toBe(user2._id.toString());
    expect(game.status).toBe("in_progress");
    expect(game.round).toBeDefined();
  });

  it("should properly handle complete round and set up the next round", () => {
    const user1 = createMockUser({ color: Color.Red });
    const user2 = createMockUser({ color: Color.Black });

    const game = GameService.initializeGame(user1, user2);

    // Set the round state to complete
    if (game.round) {
      game.round.state = "complete";
    }

    // Reset spy counters
    jest.clearAllMocks();

    // Mock the returnHandCards and checkForWinner methods
    const returnHandCardsSpy = jest
      .spyOn(RoundService, "returnHandCards")
      .mockImplementation(() => {});
    const checkForWinnerSpy = jest
      .spyOn(RoundService, "checkForWinner")
      .mockReturnValue(null);

    // Call handleRoundCompletion
    GameService["handleRoundCompletion"](game);

    // Verify the methods were called
    expect(returnHandCardsSpy).toHaveBeenCalled();
    expect(checkForWinnerSpy).toHaveBeenCalled();

    // Verify the game status
    expect(game.status).toBe("in_progress");

    // Clean up
    returnHandCardsSpy.mockRestore();
    checkForWinnerSpy.mockRestore();
  });

  it("should detect a winner and end the game", () => {
    const user1 = createMockUser({ color: Color.Red });
    const user2 = createMockUser({ color: Color.Black });

    const game = GameService.initializeGame(user1, user2);

    // Use PlayerFactory to create a winning player
    const winningPlayer = PlayerFactory.createFromUser(user1, Color.Red);
    winningPlayer.victory_points = 70; // Set victory points to trigger win condition

    // Set the round state to complete
    if (game.round) {
      game.round.state = "complete";
    }

    // Mock the returnHandCards and checkForWinner methods
    jest.spyOn(RoundService, "returnHandCards").mockImplementation(() => {});
    jest.spyOn(RoundService, "checkForWinner").mockReturnValue(winningPlayer);

    // Call handleRoundCompletion
    GameService["handleRoundCompletion"](game);

    // Verify the game is complete and player1 is the winner
    expect(game.status).toBe("complete");
    expect(game.winner).toBeDefined();
    expect(game.winner?.toString()).toBe(user1._id.toString());

    // Clean up
    jest.restoreAllMocks();
  });

  it("should properly handle a player's move", () => {
    const user1 = createMockUser({ color: Color.Red });
    const user2 = createMockUser({ color: Color.Black });

    const game = GameService.initializeGame(user1, user2);

    // Create a sample card for the move
    const sampleCard = {
      id: "test-card-1",
      color: Color.Red,
      suit: Suit.Hearts,
      number: 5,
      victoryPoints: 5,
      played: false,
    };

    // Create a move
    const move: Move = {
      playerId: user1._id.toString(),
      cards: [sampleCard],
      column: 5,
      isStake: true,
    };

    // Mock the makeMove method to avoid modifying the actual round
    const makeMoveSpy = jest
      .spyOn(RoundService, "makeMove")
      .mockImplementation(() => {});

    // Make the move
    GameService.makeMove(game, move);

    // Verify the method was called
    expect(makeMoveSpy).toHaveBeenCalled();

    // Clean up
    makeMoveSpy.mockRestore();
  });

  it("should not process moves for completed games", () => {
    const user1 = createMockUser({ color: Color.Red });
    const user2 = createMockUser({ color: Color.Black });

    const game = GameService.initializeGame(user1, user2);

    // Set the game as complete
    game.status = "complete";

    // Create a sample card for the move
    const sampleCard = {
      id: "test-card-1",
      color: Color.Red,
      suit: Suit.Hearts,
      number: 5,
      victoryPoints: 5,
      played: false,
    };

    // Create a move
    const move: Move = {
      playerId: user1._id.toString(),
      cards: [sampleCard],
      column: 5,
      isStake: true,
    };

    // Mock the makeMove method to verify it's not called
    const makeMoveSpy = jest.spyOn(RoundService, "makeMove");

    // Make the move
    GameService.makeMove(game, move);

    // Verify the method was not called
    expect(makeMoveSpy).not.toHaveBeenCalled();

    // Clean up
    makeMoveSpy.mockRestore();
  });
});
