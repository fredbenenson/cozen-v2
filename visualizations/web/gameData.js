/**
 * Game Data - Manages the game state and transformations
 */
class GameData {
    /**
     * Creates a sample game state
     * @returns {Object} The initial game state
     */
    static createSampleGameState() {
        const blackPlayer = {
            id: 'player-black',
            name: 'AI Player',
            color: 'Black',
            hand: [
                { id: 'black_8', color: 'Black', number: 8, victoryPoints: 8, played: false, suit: 'spades' },
                { id: 'black_3', color: 'Black', number: 3, victoryPoints: 3, played: false, suit: 'spades' },
                { id: 'black_7', color: 'Black', number: 7, victoryPoints: 7, played: false, suit: 'spades' },
                { id: 'black_12', color: 'Black', number: 12, victoryPoints: 12, played: false, suit: 'spades' },
                { id: 'black_4', color: 'Black', number: 4, victoryPoints: 4, played: false, suit: 'clubs' },
            ],
            jail: [],
            cards: [
                { id: 'black_9', color: 'Black', number: 9, victoryPoints: 9, played: false, suit: 'spades' },
                { id: 'black_10', color: 'Black', number: 10, victoryPoints: 10, played: false, suit: 'spades' },
                { id: 'black_5', color: 'Black', number: 5, victoryPoints: 5, played: false, suit: 'clubs' },
            ],
            victory_points: 0,
            availableStakes: [3, 2, 1, 0],
            stake_offset: -1,
        };

        const redPlayer = {
            id: 'player-red',
            name: 'Human Player',
            color: 'Red',
            hand: [
                { id: 'red_10', color: 'Red', number: 10, victoryPoints: 10, played: false, suit: 'hearts' },
                { id: 'red_5', color: 'Red', number: 5, victoryPoints: 5, played: false, suit: 'hearts' },
                { id: 'red_9', color: 'Red', number: 9, victoryPoints: 9, played: false, suit: 'hearts' },
                { id: 'red_11', color: 'Red', number: 11, victoryPoints: 11, played: false, suit: 'hearts' },
                { id: 'red_10c', color: 'Red', number: 10, victoryPoints: 10, played: false, suit: 'diamonds' },
            ],
            jail: [],
            cards: [
                { id: 'red_6', color: 'Red', number: 6, victoryPoints: 6, played: false, suit: 'hearts' },
                { id: 'red_7', color: 'Red', number: 7, victoryPoints: 7, played: false, suit: 'hearts' },
                { id: 'red_8', color: 'Red', number: 8, victoryPoints: 8, played: false, suit: 'diamonds' },
            ],
            victory_points: 0,
            availableStakes: [6, 7, 8, 9],
            stake_offset: 1,
        };

        return {
            key: 'sample-game',
            redPlayer,
            blackPlayer,
            round: {
                state: 'active',
                activePlayer: blackPlayer, // Black to move
                inactivePlayer: redPlayer,
                columns: Array(10).fill(null).map((_, i) => ({
                    index: i,
                    cards: [],
                    stakedCard: i === 4 ? {
                        // Black's first stake in column 4
                        id: 'black_6',
                        color: 'Black',
                        number: 6,
                        victoryPoints: 6,
                        played: false,
                        suit: 'spades',
                        owner: blackPlayer
                    } : i === 5 ? {
                        // Red's first stake in column 5
                        id: 'red_8',
                        color: 'Red',
                        number: 8,
                        victoryPoints: 8,
                        played: false,
                        suit: 'hearts',
                        owner: redPlayer
                    } : null
                })),
                victory_point_scores: {
                    red: 0,
                    black: 0
                }
            }
        };
    }

    /**
     * Generate possible moves for the current game state
     * @param {Object} gameState - The current game state
     * @returns {Array} List of possible moves
     */
    static generateMoves(gameState) {
        const activePlayer = gameState.round.activePlayer;
        const playerColor = activePlayer.color;
        
        // Generate stake moves
        const stakeMoves = this.generateStakeMoves(gameState, activePlayer);
        
        // Generate play moves
        const playMoves = this.generatePlayMoves(gameState, activePlayer);
        
        // Combine and return all moves
        return [...stakeMoves, ...playMoves];
    }

    /**
     * Generate stake moves
     * @param {Object} gameState 
     * @param {Object} player 
     * @returns {Array} List of stake moves
     */
    static generateStakeMoves(gameState, player) {
        const moves = [];
        const validCards = player.hand.filter(card => card.color === player.color);
        
        // For each available stake column
        for (const column of player.availableStakes) {
            // For each valid card
            for (const card of validCards) {
                // Calculate score - for stakes, use card's value
                const score = card.victoryPoints || card.number;
                
                moves.push({
                    type: 'stake',
                    cards: [card],
                    column,
                    score,
                    description: `Stake ${this.formatCardLabel(card)} in column ${column}`
                });
            }
        }
        
        return moves;
    }

    /**
     * Generate play (wager) moves
     * @param {Object} gameState 
     * @param {Object} player 
     * @returns {Array} List of play moves
     */
    static generatePlayMoves(gameState, player) {
        const moves = [];
        const validCards = player.hand.filter(card => card.color === player.color);
        
        // Find columns with stakes
        const stakedColumns = gameState.round.columns
            .map((col, index) => col.stakedCard ? index : -1)
            .filter(col => col !== -1);
        
        if (stakedColumns.length === 0 || validCards.length === 0) {
            return [];
        }
        
        // For each staked column
        for (const column of stakedColumns) {
            // Generate moves for single cards
            for (const card of validCards) {
                moves.push({
                    type: 'play',
                    cards: [card],
                    column,
                    score: card.victoryPoints || card.number,
                    description: `Play ${this.formatCardLabel(card)} to column ${column}`
                });
            }
            
            // Generate pair moves
            const pairs = this.findPairs(validCards);
            for (const pair of pairs) {
                // Score is sum of cards + 3 for the pair bonus
                const score = pair.reduce((sum, card) => sum + (card.victoryPoints || card.number), 0) + 3;
                moves.push({
                    type: 'play',
                    cards: pair,
                    column,
                    score,
                    description: `Play pair ${pair.map(c => this.formatCardLabel(c)).join(', ')} to column ${column}`
                });
            }
            
            // Generate run moves
            const runs = this.findRuns(validCards);
            for (const run of runs) {
                // Score is sum of cards + length of run
                const score = run.reduce((sum, card) => sum + (card.victoryPoints || card.number), 0) + run.length;
                moves.push({
                    type: 'play',
                    cards: run,
                    column,
                    score,
                    description: `Play run ${run.map(c => this.formatCardLabel(c)).join(', ')} to column ${column}`
                });
            }
        }
        
        return moves;
    }

    /**
     * Finds all pairs in the given cards
     * @param {Array} cards 
     * @returns {Array} List of pairs (each pair is an array of 2 cards)
     */
    static findPairs(cards) {
        const pairs = [];
        const numberGroups = new Map();
        
        // Group cards by number
        for (const card of cards) {
            if (!numberGroups.has(card.number)) {
                numberGroups.set(card.number, []);
            }
            numberGroups.get(card.number).push(card);
        }
        
        // Create pairs from cards of the same number
        for (const [_, sameNumberCards] of numberGroups.entries()) {
            if (sameNumberCards.length >= 2) {
                // For each possible pair combination
                for (let i = 0; i < sameNumberCards.length - 1; i++) {
                    for (let j = i + 1; j < sameNumberCards.length; j++) {
                        pairs.push([sameNumberCards[i], sameNumberCards[j]]);
                    }
                }
            }
        }
        
        return pairs;
    }

    /**
     * Finds all runs (straights) in the given cards
     * @param {Array} cards 
     * @returns {Array} List of runs (each run is an array of cards)
     */
    static findRuns(cards) {
        const runs = [];
        const sortedCards = [...cards].sort((a, b) => a.number - b.number);
        
        // Find runs of consecutive numbers
        for (let startIdx = 0; startIdx < sortedCards.length - 1; startIdx++) {
            // Try to build a run starting from this card
            const run = [sortedCards[startIdx]];
            let currentNumber = sortedCards[startIdx].number;
            
            for (let nextIdx = startIdx + 1; nextIdx < sortedCards.length; nextIdx++) {
                // Skip duplicate numbers
                if (sortedCards[nextIdx].number === currentNumber) {
                    continue;
                }
                
                // If the next card is exactly one number higher, add it to the run
                if (sortedCards[nextIdx].number === currentNumber + 1) {
                    run.push(sortedCards[nextIdx]);
                    currentNumber = sortedCards[nextIdx].number;
                } else {
                    // Not consecutive, break out
                    break;
                }
            }
            
            // Only add runs of at least 2 cards
            if (run.length >= 2) {
                runs.push(run);
                
                // Also add sub-runs of at least 2 cards
                if (run.length > 2) {
                    for (let i = 0; i < run.length - 1; i++) {
                        for (let j = i + 2; j <= run.length; j++) {
                            // Avoid duplicates (e.g., don't add the full run again)
                            if (j - i !== run.length) {
                                runs.push(run.slice(i, j));
                            }
                        }
                    }
                }
            }
        }
        
        return runs;
    }

    /**
     * Apply a move to a game state
     * @param {Object} gameState - The original game state
     * @param {Object} move - The move to apply
     * @returns {Object} The new game state after applying the move
     */
    static applyMove(gameState, move) {
        // Create a deep copy of the game state
        const newState = JSON.parse(JSON.stringify(gameState));
        const activePlayer = newState.round.activePlayer;
        
        // Get the cards from hand
        const cardsToPlay = move.cards.map(card => {
            const handCard = activePlayer.hand.find(c => c.id === card.id);
            return handCard;
        }).filter(card => card !== undefined);
        
        if (cardsToPlay.length !== move.cards.length) {
            console.error('Some cards not found in hand');
            return gameState;
        }
        
        if (move.type === 'stake') {
            // Handle stake move
            const card = cardsToPlay[0];
            
            // Remove from hand
            activePlayer.hand = activePlayer.hand.filter(c => c.id !== card.id);
            
            // Place as stake
            newState.round.columns[move.column].stakedCard = card;
            
            // Remove column from available stakes
            activePlayer.availableStakes = activePlayer.availableStakes.filter(c => c !== move.column);
            
            // Draw a new card
            if (activePlayer.cards.length > 0) {
                const newCard = activePlayer.cards.shift();
                activePlayer.hand.push(newCard);
            }
        } else {
            // Handle play move
            // Remove cards from hand
            activePlayer.hand = activePlayer.hand.filter(c => !cardsToPlay.some(card => card.id === c.id));
            
            // Add cards to the column
            const column = newState.round.columns[move.column];
            if (!column.cards) {
                column.cards = [];
            }
            column.cards = column.cards.concat(cardsToPlay);
        }
        
        // Switch active player
        if (activePlayer.color === 'Red') {
            newState.round.activePlayer = newState.blackPlayer;
            newState.round.inactivePlayer = newState.redPlayer;
        } else {
            newState.round.activePlayer = newState.redPlayer;
            newState.round.inactivePlayer = newState.blackPlayer;
        }
        
        return newState;
    }

    /**
     * Format a card label (e.g., "8♠", "J♥")
     * @param {Object} card 
     * @returns {string} Formatted card label
     */
    static formatCardLabel(card) {
        let cardLabel = card.number.toString();
        if (card.number === 1) cardLabel = 'A';
        if (card.number === 11) cardLabel = 'J';
        if (card.number === 12) cardLabel = 'Q';
        if (card.number === 13) cardLabel = 'K';
        
        let suitSymbol = '';
        switch (card.suit) {
            case 'hearts': suitSymbol = '♥'; break;
            case 'diamonds': suitSymbol = '♦'; break;
            case 'clubs': suitSymbol = '♣'; break;
            case 'spades': suitSymbol = '♠'; break;
        }
        
        return cardLabel + suitSymbol;
    }
}

// Export the GameData class
window.GameData = GameData;