import { Color, Card, Suit, BaseGameState } from '../types/game';
import { Player } from '../types/player';
import { Round } from '../types/round';

/**
 * ANSI color/formatting constants
 */
export const ANSI = {
  // Text formatting
  DIM: '\x1b[2m',
  BRIGHT: '\x1b[1m',
  RESET: '\x1b[0m',
  
  // Colors
  RED: '\x1b[31m',
  BLACK: '\x1b[30m',
  WHITE: '\x1b[37m',
  
  // Backgrounds
  RED_BG: '\x1b[41m',
  BLACK_BG: '\x1b[40m',
  WHITE_BG: '\x1b[47m',
};

/**
 * Helper function to render a card in a user-friendly format
 * @param card The card to display
 * @param showId Whether to show the card ID
 * @param showColor Whether to apply color to the card
 * @returns A string representation of the card
 */
export function printCard(card: Card, showId: boolean = false, showColor: boolean = true): string {
  const suitSymbol = card.suit === Suit.Hearts ? '♥'
    : card.suit === Suit.Diamonds ? '♦'
    : card.suit === Suit.Clubs ? '♣'
    : '♠';

  const numberStr = card.number === 11 ? 'J'
    : card.number === 12 ? 'Q'
    : card.number === 13 ? 'K'
    : card.number === 14 ? 'A'
    : card.number.toString();

  // Add ANSI color codes for terminal display
  const colorCode = showColor ? (card.color === Color.Red ? ANSI.RED : ANSI.BLACK) : '';
  const resetCode = showColor ? ANSI.RESET : '';

  const display = `${colorCode}${numberStr}${suitSymbol}${resetCode}`;
  return showId ? `${display}(${card.id})` : display;
}

/**
 * Renders player information in a visual format
 * @param player The player to display information for
 * @param isActive Whether this player is the active player
 * @param deckSize The number of cards remaining in the player's deck
 * @param resetText ANSI reset code for text formatting
 */
export function printPlayerInfo(
  player: any, 
  isActive: boolean, 
  deckSize: number,
  resetText: string = ANSI.RESET
): void {
  // Safety check - if player structure is invalid, show placeholder
  if (!player || !player.hand) {
    console.log(`\n[Player information unavailable]`);
    return;
  }
  
  const prefix = isActive ? '➤ ' : '  ';
  
  // Safely get player color
  const color = player.color;
  const isRed = color === Color.Red;
  
  const bgColor = isRed ? ANSI.RED_BG : ANSI.BLACK_BG;
  const playerLabel = isRed ? 'RED PLAYER' : 'BLACK PLAYER';
  
  console.log(`\n${bgColor}${ANSI.WHITE} ${playerLabel} ${resetText}`);
  
  // Print hand with card numbers in parentheses
  try {
    console.log(`${prefix}Hand: ${player.hand.map((c: Card) =>
      `${printCard(c)} (${c.number})`
    ).join(' ')}`);
  } catch (e) {
    // If card formatting fails, use a simpler approach
    console.log(`${prefix}Hand: ${player.hand.length} cards`);
  }

  console.log(`  Stakes available: ${player.availableStakes?.join(', ') || 'none'}`);
  
  try {
    console.log(`  Jail: ${player.jail?.map((c: Card) => printCard(c)).join(' ') || 'empty'}`);
  } catch (e) {
    console.log(`  Jail: ${player.jail?.length || 0} cards`);
  }
  
  console.log(`  Deck remaining: ${deckSize || 0}`);
}

/**
 * Renders the play area for a player
 * @param round The current game round
 * @param playerColor The color of the player
 * @param dimText ANSI code for dimmed text
 * @param resetText ANSI reset code for text formatting
 */
export function printPlayArea(
  round: any, 
  playerColor: Color, 
  dimText: string = ANSI.DIM, 
  resetText: string = ANSI.RESET
): void {
  try {
    const bgColor = playerColor === Color.Red ? ANSI.RED_BG : ANSI.BLACK_BG;
    const colorChar = playerColor === Color.Red ? 'R' : 'B';
    const rowOffset = playerColor === Color.Red ? 5 : 0;
    
    // Safety check - if board structure is invalid, show placeholder
    if (!round.board) {
      for (let row = 1; row < 5; row++) {
        let rowStr = row.toString().padStart(2) + ` ${bgColor}${ANSI.WHITE}${colorChar}${resetText}: `;
        for (let col = 0; col < 10; col++) {
          rowStr += `${dimText}[ ]${resetText} `.padEnd(4);
        }
        console.log(rowStr);
      }
      return;
    }
    
    for (let row = 1; row < 5; row++) {
      let rowStr = row.toString().padStart(2) + ` ${bgColor}${ANSI.WHITE}${colorChar}${resetText}: `;
      for (let col = 0; col < 10; col++) {
        // Check if there's a card in this position (with offset for red)
        const position = round.board?.[rowOffset + row]?.[col];
        const card = position?.card;
        const display = card ? `${printCard(card)}  ` : `${dimText}[ ]${resetText} `;
        rowStr += display.padEnd(4);
      }
      console.log(rowStr);
    }
  } catch (e) {
    // If rendering fails, at least show something
    console.log(`  [Play area visualization unavailable for ${playerColor} player]`);
  }
}

/**
 * Renders the full game board with column headers, stake row, and play areas
 * @param round The current game round
 * @param dimText ANSI code for dimmed text 
 * @param resetText ANSI reset code for text formatting
 * @param whiteBg ANSI code for white background (for stake row)
 */
export function printGameBoard(
  round: any,
  dimText: string = ANSI.DIM,
  resetText: string = ANSI.RESET,
  whiteBg: string = ANSI.WHITE_BG
): void {
  try {
    // Print board header
    console.log('\nBOARD:');
  
    // Column headers
    let colHeaderRow = '       ';
    for (let col = 0; col < 10; col++) {
      colHeaderRow += col.toString().padEnd(4);
    }
    console.log(colHeaderRow);
  
    // Column markers
    let colMarkerRow = '      ';
    for (let col = 0; col < 10; col++) {
      colMarkerRow += ' ↓  ';
    }
    console.log(colMarkerRow);
  
    // Black's play area (top)
    printPlayArea(round, Color.Black, dimText, resetText);
  
    try {
      // Stakes row (middle)
      let stakeRow = `${whiteBg}${ANSI.BLACK}S${resetText}:    `;
      for (let col = 0; col < 10; col++) {
        // Check for staked card in this column
        const stakeCard = round.columns?.[col]?.stakedCard;
        const display = stakeCard ? `${printCard(stakeCard)}  ` : `${dimText}[ ]${resetText} `;
        stakeRow += display.padEnd(4);
      }
      console.log(stakeRow);
    } catch (e) {
      // If stake formatting fails, show placeholder
      console.log(`${whiteBg}${ANSI.BLACK}S${resetText}:    ${dimText}[Stakes visualization unavailable]${resetText}`);
    }
  
    // Red's play area (bottom)
    printPlayArea(round, Color.Red, dimText, resetText);
  } catch (e) {
    // If board rendering completely fails, show placeholder
    console.log("\n[Game board visualization unavailable]");
  }
}

/**
 * Renders the current game state in a rich visual format
 * @param gameState The game state (works with both CLI and minimax formats)
 * @param showCommands Whether to show the command help at the bottom
 * @param clearScreen Whether to clear the terminal screen
 */
export function printGameState(
  gameState: any, 
  showCommands: boolean = false,
  clearScreen: boolean = true
): void {
  const width = 100;
  const separator = '='.repeat(width);
  
  // Optionally clear the screen (useful in game loop, but might disrupt in other contexts)
  if (clearScreen) {
    console.clear();
  }
  
  console.log('\n' + separator);
  console.log(`${ANSI.BRIGHT}COZEN GAME STATE${ANSI.RESET}`.padStart(width/2 + 8).padEnd(width));
  console.log(separator);

  // Normalize the game state structure to handle both CLI and minimax formats
  // In CLI: game = gameState, in minimax: game = {game, aiPlayer}
  const game = gameState.round ? gameState : gameState.game || gameState;
  
  // Safety check if round is defined
  if (!game.round) {
    console.log("No active round to display");
    return;
  }

  const round = game.round;
  const redPlayer = round.redPlayer;
  const blackPlayer = round.blackPlayer;
  
  // Get decks or create empty ones if not available
  const decks = game.decks || {};

  // Print scores and status
  console.log(`\n${ANSI.BRIGHT}SCORES:${ANSI.RESET}`);
  
  // Handle different structures between CLI and minimax sample game states
  // Need to be extremely defensive here as the structures can vary
  let blackScore = 0;
  let redScore = 0;
  
  // Try different paths to find the scores
  try {
    if (typeof blackPlayer.victory_points !== 'undefined') {
      blackScore = blackPlayer.victory_points;
    } else if (typeof (round as any).victory_point_scores?.black !== 'undefined') {
      blackScore = (round as any).victory_point_scores.black;
    } else if (typeof round.victoryPointScores?.black !== 'undefined') {
      blackScore = round.victoryPointScores.black;
    }
    
    if (typeof redPlayer.victory_points !== 'undefined') {
      redScore = redPlayer.victory_points;
    } else if (typeof (round as any).victory_point_scores?.red !== 'undefined') {
      redScore = (round as any).victory_point_scores.red;
    } else if (typeof round.victoryPointScores?.red !== 'undefined') {
      redScore = round.victoryPointScores.red;
    }
  } catch (e) {
    // If all fails, just use 0 (already set as default)
  }
    
  console.log(`Black: ${blackScore}   Red: ${redScore}`);

  // Print active player indicator
  const activePlayerColor = round.activePlayer.color === Color.Red ?
    `${ANSI.RED_BG}${ANSI.WHITE} RED ${ANSI.RESET}` :
    `${ANSI.BLACK_BG}${ANSI.WHITE} BLACK ${ANSI.RESET}`;
  console.log(`\n${ANSI.BRIGHT}ACTIVE PLAYER: ${ANSI.RESET}${activePlayerColor}`);

  // Print black player's information
  printPlayerInfo(
    blackPlayer, 
    round.activePlayer.color === Color.Black, 
    decks[Color.Black]?.length || 0,
    ANSI.RESET
  );

  // Print the game board
  printGameBoard(round, ANSI.DIM, ANSI.RESET, ANSI.WHITE_BG);

  // Print red player's information
  printPlayerInfo(
    redPlayer, 
    round.activePlayer.color === Color.Red, 
    decks[Color.Red]?.length || 0,
    ANSI.RESET
  );

  // Optionally print command help
  if (showCommands) {
    console.log('\nCOMMANDS:');
    console.log('  stake <card_number> <column>     e.g. "stake 5 3"');
    console.log('  play <card_number>,... <column>  e.g. "play 7,8 0"');
    console.log('  help                             Show this help text');
    console.log('  quit                             Exit the game');
  }

  console.log(separator);
}


/**
 * Find a card in player's hand by number
 * @param player The player to search in
 * @param cardNumber The card number to search for
 * @returns The found card or undefined
 */
export function findCardByNumber(player: Player, cardNumber: number): Card | undefined {
  return player.hand.find(card => card.number === cardNumber);
}