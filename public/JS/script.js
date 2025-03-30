// Initialize socket connection
const socket = io();

// Game state
let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameMode = null;
let difficulty = "easy";
let gameActive = false;
let scores = { X: 0, O: 0 };

// DOM elements
const cells = document.querySelectorAll('.cell');
const statusDisplay = document.getElementById('status');
const playHumanBtn = document.getElementById('play-human');
const playAIBtn = document.getElementById('play-ai');
const restartBtn = document.getElementById('restart');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const scoreX = document.getElementById('score-x');
const scoreO = document.getElementById('score-o');

// Winning combinations
const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    playHumanBtn.addEventListener('click', () => startGame('human'));
    playAIBtn.addEventListener('click', () => startGame('ai'));
    restartBtn.addEventListener('click', restartGame);
    
    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            difficultyBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            difficulty = e.target.id;
        });
    });
    
    cells.forEach(cell => {
        cell.addEventListener('click', () => handleCellClick(cell));
    });
    
    // Socket events for multiplayer
    socket.on('move', handleOpponentMove);
    socket.on('game-restart', handleGameRestart);
});

// Start a new game
function startGame(mode) {
    console.log(`Game started with mode: ${mode}`); // Debugging
    gameMode = mode;
    gameActive = true;
    board = ["", "", "", "", "", "", "", "", ""];
    currentPlayer = "X";

    cells.forEach(cell => {
        cell.textContent = "";
        cell.classList.remove('x', 'o', 'winning-cell');
    });

    statusDisplay.textContent = mode === 'human' ? "X's turn" : "Your turn (X)";
}

// Handle cell click
function handleCellClick(cell) {
    if (!gameActive) return;
    
    const index = cell.getAttribute('data-index');

    console.log(`Current Player: ${currentPlayer}`);
    console.log(`Board State: `, board);
    console.log(`Clicked Cell Index: ${index}`);

    
    if (board[index] !== "") return;
    
    updateCell(cell, index);
    
    if (checkWin(currentPlayer)) {
        endGame(false);
        return;
    }
    
    if (checkDraw()) {
        endGame(true);
        return;
    }
    
    changePlayer();
    
    if (gameMode === 'ai' && currentPlayer === 'O') {
        setTimeout(makeAIMove, 600);
    }
    
    // For multiplayer mode
    if (gameMode === 'human') {
        socket.emit('make-move', { index, player: currentPlayer });
    }
}

// Update cell with player's mark
function updateCell(cell, index) {
    board[index] = currentPlayer;
    cell.textContent = currentPlayer; // Ensure this line executes
    cell.classList.add(currentPlayer.toLowerCase());
    console.log(`Updated cell ${index} with ${currentPlayer}`);
}

// Handle opponent's move in multiplayer
function handleOpponentMove(data) {
    if (gameMode !== 'human') return;
    
    const { index, player } = data;
    const cell = document.querySelector(`[data-index="${index}"]`);
    
    board[index] = player;
    cell.textContent = player;
    cell.classList.add(player.toLowerCase());
    
    if (checkWin(player)) {
        endGame(false);
        return;
    }
    
    if (checkDraw()) {
        endGame(true);
        return;
    }
    
    changePlayer();
}

// Change current player
function changePlayer() {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    
    if (gameMode === 'human') {
        statusDisplay.textContent = `${currentPlayer}'s turn`;
    } else {
        statusDisplay.textContent = currentPlayer === 'X' ? "Your turn (X)" : "AI thinking...";
    }
}

// Check for win
function checkWin(player) {
    return winPatterns.some(combination => {
        if (combination.every(index => board[index] === player)) {
            highlightWinningCells(combination);
            return true;
        }
        return false;
    });
}

// Highlight winning cells
function highlightWinningCells(combination) {
    combination.forEach(index => {
        document.querySelector(`[data-index="${index}"]`).classList.add('winning-cell');
    });
}

// Check for draw
function checkDraw() {
    return board.every(cell => cell !== "");
}

// End the game
function endGame(isDraw) {
    gameActive = false;
    
    if (isDraw) {
        statusDisplay.textContent = "Game ended in a draw!";
    } else {
        if (gameMode === 'ai') {
            statusDisplay.textContent = currentPlayer === 'X' ? "You won!" : "AI won!";
        } else {
            statusDisplay.textContent = `Player ${currentPlayer} wins!`;
        }
        
        // Update scores
        scores[currentPlayer]++;
        scoreX.textContent = scores.X;
        scoreO.textContent = scores.O;
    }
}

// Restart the game
function restartGame() {
    if (gameMode) {
        startGame(gameMode);
        
        // For multiplayer mode
        if (gameMode === 'human') {
            socket.emit('restart-game');
        }
    } else {
        statusDisplay.textContent = "Choose a game mode to start";
    }
}

// Handle game restart in multiplayer
function handleGameRestart() {
    if (gameMode === 'human') {
        startGame('human');
    }
}

// AI move based on difficulty
function makeAIMove() {
    if (!gameActive) return;
    
    let index;
    
    switch (difficulty) {
        case 'easy':
            index = makeRandomMove();
            break;
        case 'medium':
            // 50% chance of making a smart move
            index = Math.random() < 0.5 ? makeSmartMove() : makeRandomMove();
            break;
        case 'hard':
            index = makeSmartMove();
            break;
        default:
            index = makeRandomMove();
    }
    
    const cell = document.querySelector(`[data-index="${index}"]`);
    updateCell(cell, index);
    
    if (checkWin(currentPlayer)) {
        endGame(false);
        return;
    }
    
    if (checkDraw()) {
        endGame(true);
        return;
    }
    
    changePlayer();
}

// Make a random move for AI
function makeRandomMove() {
    const emptyCells = board.map((cell, index) => cell === "" ? index : null).filter(index => index !== null);
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

// Make a smart move using minimax algorithm
function makeSmartMove() {
    // First move optimization - pick center or corner
    const emptyCells = board.map((cell, index) => cell === "" ? index : null).filter(index => index !== null);
    
    if (emptyCells.length === 9) {
        // First move - pick center or corner
        const firstMoves = [0, 2, 4, 6, 8];
        return firstMoves[Math.floor(Math.random() * firstMoves.length)];
    }
    
    if (emptyCells.length === 8 && board[4] === "") {
        // Second move - pick center if available
        return 4;
    }
    
    // Use minimax for other moves
    const result = minimax(board, 'O', 0);
    return result.index;
}

// Minimax algorithm with alpha-beta pruning and depth limitation
function minimax(newBoard, player, depth, alpha = -Infinity, beta = Infinity) {
    const emptyCells = newBoard.map((cell, index) => cell === "" ? index : null).filter(index => index !== null);
    
    // Terminal states
    if (checkWinningState(newBoard, 'X')) {
        return { score: -10 + depth };
    }
    
    if (checkWinningState(newBoard, 'O')) {
        return { score: 10 - depth };
    }
    
    if (emptyCells.length === 0) {
        return { score: 0 };
    }
    
    // Depth limitation for medium difficulty
    if (difficulty === 'medium' && depth > 2) {
        return { score: 0 };
    }
    
    let bestMove = {};
    
    if (player === 'O') {
        let bestScore = -Infinity;
        
        for (let i = 0; i < emptyCells.length; i++) {
            const index = emptyCells[i];
            newBoard[index] = player;
            
            const result = minimax(newBoard, 'X', depth + 1, alpha, beta);
            newBoard[index] = "";
            
            if (result.score > bestScore) {
                bestScore = result.score;
                bestMove = { index, score: bestScore };
            }
            
            alpha = Math.max(alpha, bestScore);
            if (beta <= alpha) break;
        }
    } else {
        let bestScore = Infinity;
        
        for (let i = 0; i < emptyCells.length; i++) {
            const index = emptyCells[i];
            newBoard[index] = player;
            
            const result = minimax(newBoard, 'O', depth + 1, alpha, beta);
            newBoard[index] = "";
            
            if (result.score < bestScore) {
                bestScore = result.score;
                bestMove = { index, score: bestScore };
            }
            
            beta = Math.min(beta, bestScore);
            if (beta <= alpha) break;
        }
    }
    
    return bestMove;
}

// Check if a player has won (for minimax)
function checkWinningState(board, player) {
    return winPatterns.some(combination => 
        combination.every(index => board[index] === player)
    );
}