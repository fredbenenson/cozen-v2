/**
 * Cozen Game Tree Visualizer
 * 
 * This script manages the game tree visualization, communicating with the
 * Node.js backend to get game state, moves, and evaluations.
 */

// API endpoint (defaults to same origin)
const API_BASE = window.location.origin;

// Main Visualizer class
class GameVisualizer {
    constructor() {
        this.currentGameState = null;
        this.currentMoves = [];
        this.selectedMove = null;
        this.childStates = [];
        this.boardRenderer = null;
        this.searchDepth = 2;
        
        // Initialize the visualization
        this.init();
    }
    
    // Initialize the visualizer
    async init() {
        // Set up the board renderer
        const boardContainer = document.querySelector('#root-state .game-board');
        this.boardRenderer = new BoardRenderer(boardContainer);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load the initial game state
        await this.loadGameState();
        
        // Generate moves for the current state
        await this.generateMoves();
    }
    
    // Set up event listeners
    setupEventListeners() {
        // Reset button
        document.getElementById('reset-button').addEventListener('click', () => {
            this.resetGame();
        });
        
        // Depth selector
        document.getElementById('depth-selector').addEventListener('change', (e) => {
            this.searchDepth = parseInt(e.target.value);
            this.generateMoves();
        });
    }
    
    // Load the current game state from the API
    async loadGameState() {
        try {
            const response = await fetch(`${API_BASE}/api/game`);
            if (!response.ok) throw new Error('Failed to load game state');
            
            this.currentGameState = await response.json();
            this.renderGameState();
        } catch (error) {
            console.error('Error loading game state:', error);
            this.showError('Failed to load game state');
        }
    }
    
    // Reset the game to initial state
    async resetGame() {
        try {
            const response = await fetch(`${API_BASE}/api/game/reset`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to reset game');
            
            this.currentGameState = await response.json();
            this.selectedMove = null;
            this.childStates = [];
            this.renderGameState();
            await this.generateMoves();
        } catch (error) {
            console.error('Error resetting game:', error);
            this.showError('Failed to reset game');
        }
    }
    
    // Generate possible moves for the current state
    async generateMoves() {
        try {
            const response = await fetch(`${API_BASE}/api/moves`);
            if (!response.ok) throw new Error('Failed to generate moves');
            
            const data = await response.json();
            this.currentMoves = data.moves;
            this.renderMoves();
            
            // Update minimax info
            document.querySelector('#nodes-explored span').textContent = data.stats.nodesExplored;
            document.querySelector('#evaluation-time span').textContent = `${data.stats.timeElapsed}ms`;
        } catch (error) {
            console.error('Error generating moves:', error);
            this.showError('Failed to generate moves');
        }
    }
    
    // Apply a move and get the new state
    async applyMove(move) {
        try {
            const response = await fetch(`${API_BASE}/api/move/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ move })
            });
            
            if (!response.ok) throw new Error('Failed to apply move');
            
            return await response.json();
        } catch (error) {
            console.error('Error applying move:', error);
            this.showError('Failed to apply move');
            return null;
        }
    }
    
    // Evaluate a move using minimax
    async evaluateMove(move) {
        try {
            const response = await fetch(`${API_BASE}/api/move/evaluate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    move, 
                    depth: this.searchDepth 
                })
            });
            
            if (!response.ok) throw new Error('Failed to evaluate move');
            
            return await response.json();
        } catch (error) {
            console.error('Error evaluating move:', error);
            this.showError('Failed to evaluate move');
            return { score: 0 };
        }
    }
    
    // Render the current game state
    renderGameState() {
        if (!this.currentGameState) return;
        
        // Render the game board
        this.boardRenderer.render(this.currentGameState);
        
        // Update player info
        this.updatePlayerInfo();
        
        // Update scores
        this.updateScores();
    }
    
    // Update player information display
    updatePlayerInfo() {
        const blackPlayer = this.currentGameState.blackPlayer;
        const redPlayer = this.currentGameState.redPlayer;
        const activePlayer = this.currentGameState.round.activePlayer;
        
        // Update player active status
        document.querySelector('.player.black').classList.toggle('active', activePlayer.color === 'Black');
        document.querySelector('.player.red').classList.toggle('active', activePlayer.color === 'Red');
        
        // Update hands
        this.renderHand(blackPlayer, document.querySelector('.player.black .hand'));
        this.renderHand(redPlayer, document.querySelector('.player.red .hand'));
        
        // Update stakes info
        document.querySelector('.player.black .stakes').textContent = `Stakes: ${blackPlayer.availableStakes.join(', ')}`;
        document.querySelector('.player.red .stakes').textContent = `Stakes: ${redPlayer.availableStakes.join(', ')}`;
    }
    
    // Render a player's hand
    renderHand(player, container) {
        container.innerHTML = '';
        
        player.hand.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = `card ${player.color.toLowerCase()}`;
            
            // Format card value and suit
            let suitSymbol = '';
            switch (card.suit) {
                case 'hearts': suitSymbol = '♥'; break;
                case 'diamonds': suitSymbol = '♦'; break;
                case 'clubs': suitSymbol = '♣'; break;
                case 'spades': suitSymbol = '♠'; break;
            }
            
            // Handle face cards
            let cardValue = card.number.toString();
            if (card.number === 1) cardValue = 'A';
            if (card.number === 11) cardValue = 'J';
            if (card.number === 12) cardValue = 'Q';
            if (card.number === 13) cardValue = 'K';
            
            cardElement.textContent = cardValue + suitSymbol;
            cardElement.dataset.cardId = card.id;
            
            container.appendChild(cardElement);
        });
    }
    
    // Update score display
    updateScores() {
        const scores = this.currentGameState.round.victory_point_scores;
        document.querySelector('.score-info').textContent = `Black: ${scores.black} | Red: ${scores.red}`;
    }
    
    // Render available moves
    renderMoves() {
        const container = document.querySelector('.move-options');
        container.innerHTML = '';
        
        // Sort moves by score (best first)
        const sortedMoves = [...this.currentMoves].sort((a, b) => b.score - a.score);
        
        sortedMoves.forEach((move, index) => {
            const moveButton = document.createElement('button');
            moveButton.className = `move-button ${move.isStake ? 'stake' : 'play'}`;
            moveButton.dataset.moveIndex = index;
            
            // Create score display
            const scoreSpan = document.createElement('span');
            scoreSpan.className = `score ${move.score < 0 ? 'negative' : ''}`;
            scoreSpan.textContent = move.score;
            
            // Create move text
            let moveText = move.isStake 
                ? `Stake col ${move.column}` 
                : `Play to col ${move.column}`;
            
            // Add cards to text
            if (move.cards && move.cards.length) {
                moveText += ` (${move.cards.length} card${move.cards.length > 1 ? 's' : ''})`;
            }
            
            moveButton.appendChild(scoreSpan);
            moveButton.appendChild(document.createTextNode(' ' + moveText));
            
            // Handle move selection
            moveButton.addEventListener('click', () => {
                this.selectMove(move, index);
                
                // Update UI to show this move is selected
                document.querySelectorAll('.move-button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                moveButton.classList.add('selected');
            });
            
            container.appendChild(moveButton);
        });
    }
    
    // Select a move and generate child states
    async selectMove(move, index) {
        this.selectedMove = move;
        
        // Update move details panel
        this.updateMoveDetails(move);
        
        // Clear previous child states
        this.childStates = [];
        document.getElementById('child-states-container').innerHTML = '';
        
        // Apply the move to get the new state
        const newState = await this.applyMove(move);
        if (!newState) return;
        
        // Generate the child state element
        this.renderChildState(newState, move);
    }
    
    // Update move details panel
    async updateMoveDetails(move) {
        document.querySelector('#move-score span').textContent = move.score;
        
        // Create move description
        let description = move.isStake 
            ? `Stake in column ${move.column}` 
            : `Play to column ${move.column}`;
        
        // Add cards
        if (move.cards && move.cards.length) {
            const cardNames = move.cards.map(card => {
                const number = card.number;
                let value = number.toString();
                if (number === 1) value = 'A';
                if (number === 11) value = 'J';
                if (number === 12) value = 'Q';
                if (number === 13) value = 'K';
                
                let suit = '';
                switch (card.suit) {
                    case 'hearts': suit = '♥'; break;
                    case 'diamonds': suit = '♦'; break;
                    case 'clubs': suit = '♣'; break;
                    case 'spades': suit = '♠'; break;
                }
                
                return value + suit;
            });
            
            description += ` with cards: ${cardNames.join(', ')}`;
        }
        
        document.getElementById('move-description').textContent = description;
        
        // Evaluate with minimax (if not already done)
        if (move.score !== undefined) {
            document.querySelector('#minimax-value span').textContent = move.score;
        } else {
            const evaluation = await this.evaluateMove(move);
            document.querySelector('#minimax-value span').textContent = evaluation.score;
        }
    }
    
    // Render a child state after applying a move
    renderChildState(gameState, move) {
        const container = document.getElementById('child-states-container');
        
        // Create child state element
        const stateElement = document.createElement('div');
        stateElement.className = 'game-state child-state';
        
        // Create heading with move info
        const heading = document.createElement('h3');
        
        // Format the heading based on move type
        if (move.isStake) {
            heading.textContent = `Stake in column ${move.column}`;
        } else {
            heading.textContent = `Play to column ${move.column}`;
        }
        
        // Create score info
        const scoreInfo = document.createElement('div');
        scoreInfo.className = 'score-info';
        scoreInfo.textContent = `Black: ${gameState.round.victory_point_scores.black} | Red: ${gameState.round.victory_point_scores.red}`;
        
        // Create game board container
        const boardContainer = document.createElement('div');
        boardContainer.className = 'game-board';
        
        // Create player info
        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';
        
        // Render only the active player's info for simplicity
        const activePlayer = gameState.round.activePlayer;
        const playerElement = document.createElement('div');
        playerElement.className = `player ${activePlayer.color.toLowerCase()} active`;
        
        const playerHeading = document.createElement('h4');
        playerHeading.textContent = `${activePlayer.color} Player's Turn`;
        
        const handContainer = document.createElement('div');
        handContainer.className = 'hand';
        
        // Add elements to the DOM
        playerElement.appendChild(playerHeading);
        playerElement.appendChild(handContainer);
        playerInfo.appendChild(playerElement);
        
        stateElement.appendChild(heading);
        stateElement.appendChild(scoreInfo);
        stateElement.appendChild(boardContainer);
        stateElement.appendChild(playerInfo);
        
        container.appendChild(stateElement);
        
        // Render the board for this state
        const boardRenderer = new BoardRenderer(boardContainer);
        boardRenderer.render(gameState);
        
        // Render player's hand
        this.renderHand(activePlayer, handContainer);
        
        // Store the child state for reference
        this.childStates.push({
            element: stateElement,
            state: gameState,
            move: move
        });
    }
    
    // Show an error message
    showError(message) {
        alert(`Error: ${message}`);
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new GameVisualizer();
});