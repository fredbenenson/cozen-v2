/**
 * Board Renderer - Handles rendering the game board state
 * This version is designed to work with the actual game state format
 */
class BoardRenderer {
    /**
     * Create a new board renderer
     * @param {HTMLElement} container - The container element to render in
     */
    constructor(container) {
        this.container = container;
    }

    /**
     * Render the game board
     * @param {Object} gameState - The game state object to render
     */
    render(gameState) {
        // Clear the container
        this.container.innerHTML = '';

        // Create the board grid
        this.createHeaderRow();
        this.createBoardGrid(gameState);
        
        // Add cards to the board
        this.placeCards(gameState);
    }

    /**
     * Create the header row with column numbers
     */
    createHeaderRow() {
        // Empty corner cell
        const cornerCell = document.createElement('div');
        cornerCell.className = 'board-header corner';
        this.container.appendChild(cornerCell);

        // Column headers (0-9)
        for (let col = 0; col < 10; col++) {
            const headerCell = document.createElement('div');
            headerCell.className = 'board-header column';
            
            // Create column number with styling
            const colWrapper = document.createElement('div');
            colWrapper.className = 'col-number-wrapper';
            
            const colNumber = document.createElement('span');
            colNumber.className = 'col-number';
            colNumber.textContent = col;
            
            colWrapper.appendChild(colNumber);
            headerCell.appendChild(colWrapper);
            
            this.container.appendChild(headerCell);
        }
    }

    /**
     * Create the main board grid
     * @param {Object} gameState 
     */
    createBoardGrid(gameState) {
        // Create 4 rows for Black
        for (let row = 0; row < 4; row++) {
            this.createPlayerRow('B', row + 1, 'black');
        }

        // Create stake row
        this.createStakeRow();

        // Create 4 rows for Red
        for (let row = 0; row < 4; row++) {
            this.createPlayerRow('R', row + 1, 'red');
        }
    }

    /**
     * Create a player row
     * @param {string} label - Row label (B or R) 
     * @param {number} rowNum - Row number
     * @param {string} playerColor - black or red
     */
    createPlayerRow(label, rowNum, playerColor) {
        // Row label cell
        const labelCell = document.createElement('div');
        labelCell.className = 'board-header';
        
        // Create styled label similar to PDF format
        const labelWrapper = document.createElement('div');
        labelWrapper.className = `row-label ${playerColor}`;
        
        // Add row number
        const rowNumSpan = document.createElement('span');
        rowNumSpan.textContent = rowNum;
        labelWrapper.appendChild(rowNumSpan);
        
        // Add player indicator (B or R)
        const playerIndicator = document.createElement('span');
        playerIndicator.className = 'player-indicator';
        playerIndicator.textContent = label;
        labelWrapper.appendChild(playerIndicator);
        
        labelCell.appendChild(labelWrapper);
        this.container.appendChild(labelCell);

        // Row cells
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.className = `board-cell ${playerColor}-position`;
            cell.dataset.row = rowNum;
            cell.dataset.col = col;
            cell.dataset.player = playerColor;
            this.container.appendChild(cell);
        }
    }

    /**
     * Create the stake row
     */
    createStakeRow() {
        // Stake row label
        const labelCell = document.createElement('div');
        labelCell.className = 'board-header';
        
        // Create styled stake label similar to PDF format
        const labelWrapper = document.createElement('div');
        labelWrapper.className = 'row-label stake';
        
        // Add stake indicator
        const stakeIndicator = document.createElement('span');
        stakeIndicator.className = 'stake-indicator';
        stakeIndicator.textContent = 'S';
        labelWrapper.appendChild(stakeIndicator);
        
        labelCell.appendChild(labelWrapper);
        this.container.appendChild(labelCell);

        // Stake positions
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.className = 'board-cell stake-row';
            cell.dataset.row = 'stake';
            cell.dataset.col = col;
            this.container.appendChild(cell);
        }
    }

    /**
     * Place cards on the board
     * @param {Object} gameState 
     */
    placeCards(gameState) {
        if (!gameState || !gameState.round || !gameState.round.columns) {
            return;
        }

        // Place stake cards
        gameState.round.columns.forEach((column, colIndex) => {
            if (column.stakedCard) {
                const stakeCell = this.container.querySelector(`.board-cell[data-row="stake"][data-col="${colIndex}"]`);
                if (stakeCell) {
                    const card = this.createCardElement(column.stakedCard, 'stake');
                    // For stake cards, we need to adjust the transform since it has a scale
                    card.style.transform = 'translate(-50%, -50%) scale(0.9)';
                    stakeCell.appendChild(card);
                }
            }
            
            // Place played cards
            if (column.cards && column.cards.length) {
                // Group cards by color
                const blackCards = column.cards.filter(card => card.color.toLowerCase() === 'black');
                const redCards = column.cards.filter(card => card.color.toLowerCase() === 'red');
                
                // Place black cards (stack in appropriate row)
                if (blackCards.length > 0) {
                    // Get the row to place in based on card count
                    let cellRow;
                    if (blackCards.length <= 2) cellRow = 1;
                    else if (blackCards.length <= 4) cellRow = 2;
                    else if (blackCards.length <= 6) cellRow = 3;
                    else cellRow = 4;
                    
                    const cell = this.container.querySelector(
                        `.board-cell[data-player="black"][data-row="${cellRow}"][data-col="${colIndex}"]`
                    );
                    
                    if (cell) {
                        // Create a card stack wrapper
                        const stackWrapper = document.createElement('div');
                        stackWrapper.className = 'card-stack';
                        cell.appendChild(stackWrapper);
                        
                        // Add cards to stack with offset
                        blackCards.forEach((card, index) => {
                            const cardElement = this.createCardElement(card);
                            // Reset default transform (from translate -50%, -50%) to apply our own
                            cardElement.style.transform = 'none';
                            // Apply staggered offset for stacked cards
                            cardElement.style.top = `calc(50% - ${21 - index * 2}px)`;
                            cardElement.style.left = `calc(50% - ${15 - index * 2}px)`;
                            cardElement.style.zIndex = index + 1;
                            stackWrapper.appendChild(cardElement);
                        });
                    }
                }
                
                // Place red cards (stack in appropriate row)
                if (redCards.length > 0) {
                    // Get the row to place in based on card count
                    let cellRow;
                    if (redCards.length <= 2) cellRow = 1;
                    else if (redCards.length <= 4) cellRow = 2;
                    else if (redCards.length <= 6) cellRow = 3;
                    else cellRow = 4;
                    
                    const cell = this.container.querySelector(
                        `.board-cell[data-player="red"][data-row="${cellRow}"][data-col="${colIndex}"]`
                    );
                    
                    if (cell) {
                        // Create a card stack wrapper
                        const stackWrapper = document.createElement('div');
                        stackWrapper.className = 'card-stack';
                        cell.appendChild(stackWrapper);
                        
                        // Add cards to stack with offset
                        redCards.forEach((card, index) => {
                            const cardElement = this.createCardElement(card);
                            // Reset default transform (from translate -50%, -50%) to apply our own
                            cardElement.style.transform = 'none';
                            // Apply staggered offset for stacked cards
                            cardElement.style.top = `calc(50% - ${21 - index * 2}px)`;
                            cardElement.style.left = `calc(50% - ${15 - index * 2}px)`;
                            cardElement.style.zIndex = index + 1;
                            stackWrapper.appendChild(cardElement);
                        });
                    }
                }
            }
        });
    }

    /**
     * Create a card element
     * @param {Object} card 
     * @param {string} [cardType] - Optional type (e.g., "stake")
     * @returns {HTMLElement}
     */
    createCardElement(card, cardType = '') {
        const cardElement = document.createElement('div');
        cardElement.className = `board-card ${card.color.toLowerCase()}`;
        
        if (cardType) {
            cardElement.classList.add(cardType);
        }
        
        // Create card inner content
        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';
        
        // Create top-left corner value
        const topLeftValue = document.createElement('div');
        topLeftValue.className = 'card-value top-left';
        
        // Create bottom-right corner value
        const bottomRightValue = document.createElement('div');
        bottomRightValue.className = 'card-value bottom-right';
        
        // Format card label
        let label = card.number.toString();
        if (card.number === 1) label = 'A';
        if (card.number === 11) label = 'J';
        if (card.number === 12) label = 'Q';
        if (card.number === 13) label = 'K';
        
        // Get suit symbol
        let suitSymbol = '';
        switch (card.suit) {
            case 'hearts': suitSymbol = '♥'; break;
            case 'diamonds': suitSymbol = '♦'; break;
            case 'clubs': suitSymbol = '♣'; break;
            case 'spades': suitSymbol = '♠'; break;
        }
        
        // Set text content for value corners
        topLeftValue.innerHTML = `${label}<br>${suitSymbol}`;
        bottomRightValue.innerHTML = `${label}<br>${suitSymbol}`;
        
        // Create central suit symbol for greater visibility
        const centralSuit = document.createElement('div');
        centralSuit.className = 'card-suit central';
        centralSuit.textContent = suitSymbol;
        
        // Assemble card components
        cardInner.appendChild(topLeftValue);
        cardInner.appendChild(centralSuit);
        cardInner.appendChild(bottomRightValue);
        
        cardElement.appendChild(cardInner);
        cardElement.dataset.cardId = card.id;
        
        return cardElement;
    }
}

// Export for use in other scripts
window.BoardRenderer = BoardRenderer;