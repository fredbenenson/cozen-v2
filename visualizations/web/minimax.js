/**
 * Minimax Engine - Handles AI move evaluation using minimax algorithm
 */
class MinimaxEngine {
    /**
     * Create a new minimax engine
     * @param {number} maxDepth - Maximum search depth
     */
    constructor(maxDepth = 3) {
        this.maxDepth = maxDepth;
        this.nodeCount = 0;
        this.startTime = 0;
        this.bestMove = null;
    }

    /**
     * Find the best move using minimax algorithm
     * @param {Object} gameState - The current game state
     * @param {number} depth - Optional depth override
     * @returns {Object} Best move with evaluation details
     */
    findBestMove(gameState, depth = null) {
        this.nodeCount = 0;
        this.startTime = Date.now();
        this.bestMove = null;
        
        const searchDepth = depth || this.maxDepth;
        const moves = GameData.generateMoves(gameState);
        
        if (moves.length === 0) {
            return { move: null, score: 0, nodes: 0, time: 0 };
        }
        
        let bestScore = -Infinity;
        let bestMove = null;
        
        // For each possible move
        for (const move of moves) {
            // Apply the move to get a new state
            const newState = GameData.applyMove(gameState, move);
            
            // Use minimax to evaluate this move
            const score = this.minimax(newState, searchDepth - 1, false, -Infinity, Infinity);
            
            // Update best move if this is better
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        const evaluationTime = Date.now() - this.startTime;
        
        this.bestMove = bestMove;
        return {
            move: bestMove,
            score: bestScore,
            nodes: this.nodeCount,
            time: evaluationTime
        };
    }

    /**
     * Minimax algorithm with alpha-beta pruning
     * @param {Object} gameState - Current game state
     * @param {number} depth - Current depth
     * @param {boolean} maximizingPlayer - Whether current player is maximizing
     * @param {number} alpha - Alpha value for pruning
     * @param {number} beta - Beta value for pruning
     * @returns {number} Evaluated score
     */
    minimax(gameState, depth, maximizingPlayer, alpha, beta) {
        this.nodeCount++;
        
        // Terminal cases
        if (depth === 0 || gameState.round.state === 'complete') {
            return this.evaluateGameState(gameState);
        }
        
        const moves = GameData.generateMoves(gameState);
        
        if (moves.length === 0) {
            return this.evaluateGameState(gameState);
        }
        
        if (maximizingPlayer) {
            let maxEval = -Infinity;
            
            for (const move of moves) {
                const newState = GameData.applyMove(gameState, move);
                const score = this.minimax(newState, depth - 1, false, alpha, beta);
                
                maxEval = Math.max(maxEval, score);
                alpha = Math.max(alpha, score);
                
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            
            return maxEval;
        } else {
            let minEval = Infinity;
            
            for (const move of moves) {
                const newState = GameData.applyMove(gameState, move);
                const score = this.minimax(newState, depth - 1, true, alpha, beta);
                
                minEval = Math.min(minEval, score);
                beta = Math.min(beta, score);
                
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            
            return minEval;
        }
    }

    /**
     * Evaluate the game state
     * @param {Object} gameState 
     * @returns {number} Score from Black's perspective
     */
    evaluateGameState(gameState) {
        const blackPlayer = gameState.blackPlayer;
        const redPlayer = gameState.redPlayer;
        
        // Primary factor: Victory point difference
        let score = (blackPlayer.victory_points || 0) - (redPlayer.victory_points || 0);
        
        // Add position evaluation factors
        
        // 1. Hand strength
        const blackHandStrength = this.evaluateHandStrength(blackPlayer.hand);
        const redHandStrength = this.evaluateHandStrength(redPlayer.hand);
        score += blackHandStrength - redHandStrength;
        
        // 2. Cards in jail (captured cards)
        score += blackPlayer.jail.length - redPlayer.jail.length;
        
        // 3. Stakes available
        score += (blackPlayer.availableStakes.length - redPlayer.availableStakes.length) * 0.5;
        
        // 4. Cards in hand
        score += (blackPlayer.hand.length - redPlayer.hand.length) * 0.2;
        
        return score;
    }

    /**
     * Evaluate the strength of a player's hand
     * @param {Array} hand 
     * @returns {number} Hand strength score
     */
    evaluateHandStrength(hand) {
        let strength = 0;
        
        // Check for pairs
        const numberCounts = new Map();
        for (const card of hand) {
            numberCounts.set(card.number, (numberCounts.get(card.number) || 0) + 1);
        }
        
        // Score pairs (3 points each)
        for (const [_, count] of numberCounts.entries()) {
            if (count >= 2) {
                strength += 3;
            }
        }
        
        // Check for straights
        const cardNumbers = [...hand].map(c => c.number).sort((a, b) => a - b);
        let maxStraightLength = 1;
        let currentStraightLength = 1;
        
        for (let i = 1; i < cardNumbers.length; i++) {
            if (cardNumbers[i] === cardNumbers[i-1] + 1) {
                currentStraightLength++;
            } else if (cardNumbers[i] !== cardNumbers[i-1]) {
                currentStraightLength = 1;
            }
            maxStraightLength = Math.max(maxStraightLength, currentStraightLength);
        }
        
        // Add points for straights (1 point per card in straight)
        if (maxStraightLength >= 2) {
            strength += maxStraightLength;
        }
        
        return strength;
    }

    /**
     * Evaluate all moves and return scores
     * @param {Object} gameState 
     * @param {Array} moves 
     * @param {number} depth 
     * @returns {Array} Moves with scores
     */
    evaluateAllMoves(gameState, moves, depth = 2) {
        this.nodeCount = 0;
        this.startTime = Date.now();
        
        const evaluatedMoves = moves.map(move => {
            const newState = GameData.applyMove(gameState, move);
            const score = this.minimax(newState, depth - 1, false, -Infinity, Infinity);
            
            return {
                ...move,
                minimaxScore: score
            };
        });
        
        // Sort by minimax score
        evaluatedMoves.sort((a, b) => b.minimaxScore - a.minimaxScore);
        
        return {
            moves: evaluatedMoves,
            nodes: this.nodeCount,
            time: Date.now() - this.startTime
        };
    }
}

// Export the MinimaxEngine class
window.MinimaxEngine = MinimaxEngine;