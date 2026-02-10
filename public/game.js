let socket;
let currentUser = null;
let currentGameId = null;
let board = Array(9).fill(null);
let currentTurn = 'X';
let gameActive = false;
let mySymbol = null;
let gameMode = null; // 'multiplayer', 'local', 'cpu'
let localPlayer = 'X'; // For local mode tracking
let cpuSymbol = 'O'; // CPU always plays as O

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/index.html';
        return;
    }

    currentUser = user;
    document.getElementById('username-display').textContent = user.username;

    // Show admin panel if user is admin
    if (user.isAdmin) {
        document.getElementById('admin-nav').style.display = 'block';
    }

    // Initialize socket
    socket = io();

    // Emit login event
    socket.emit('user-login', user);

    // Socket event listeners
    socket.on('users-online', handleUsersOnline);
    socket.on('login-success', handleLoginSuccess);
    socket.on('waiting-for-opponent', handleWaitingForOpponent);
    socket.on('game-start', handleGameStart);
    socket.on('move-made', handleMoveMade);
    socket.on('game-end', handleGameEnd);
    socket.on('invalid-move', handleInvalidMove);
    socket.on('user-searching', handleUserSearching);
    socket.on('user-disconnected', handleUserDisconnected);

    // Load initial data
    loadLeaderboard();
});

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');

    // Load tab-specific data
    if (tabName === 'leaderboard') {
        loadLeaderboard();
    } else if (tabName === 'admin') {
        loadAdminPanel();
    }
}

function selectGameMode(mode) {
    gameMode = mode;
    document.getElementById('game-mode-selection').style.display = 'none';
    document.getElementById('game-section').style.display = 'block';

    if (mode === 'multiplayer') {
        document.getElementById('game-title').textContent = 'Multiplayer Game';
        document.getElementById('online-sidebar').style.display = 'block';
        document.getElementById('find-opponent-btn').style.display = 'inline-block';
        document.getElementById('start-local-btn').style.display = 'none';
        document.getElementById('start-cpu-btn').style.display = 'none';
        document.getElementById('game-status').textContent = 'Click "Find Opponent" to start';
    } else if (mode === 'local') {
        document.getElementById('game-title').textContent = 'Local 2-Player Game';
        document.getElementById('online-sidebar').style.display = 'none';
        document.getElementById('find-opponent-btn').style.display = 'none';
        document.getElementById('start-local-btn').style.display = 'inline-block';
        document.getElementById('start-cpu-btn').style.display = 'none';
        document.getElementById('game-status').textContent = 'Click "Start Game" to begin';
    } else if (mode === 'cpu') {
        document.getElementById('game-title').textContent = 'Play vs CPU';
        document.getElementById('online-sidebar').style.display = 'none';
        document.getElementById('find-opponent-btn').style.display = 'none';
        document.getElementById('start-local-btn').style.display = 'none';
        document.getElementById('start-cpu-btn').style.display = 'inline-block';
        document.getElementById('game-status').textContent = 'Click "Start vs CPU" to play';
    }
}

function backToModeSelection() {
    resetGame();
    document.getElementById('game-mode-selection').style.display = 'block';
    document.getElementById('game-section').style.display = 'none';
    gameMode = null;
}

function handleUsersOnline(users) {
    const usersList = document.getElementById('online-users-list');
    usersList.innerHTML = '';

    if (users.length === 0) {
        usersList.innerHTML = '<p class="loading">No users online</p>';
        return;
    }

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item online';
        userItem.textContent = user.username;
        usersList.appendChild(userItem);
    });
}

function handleUserSearching(data) {
    console.log(data.username + ' is searching for opponent');
}

function handleUserDisconnected(data) {
    console.log(data.username + ' disconnected');
}

function findOpponent() {
    const btn = document.getElementById('find-opponent-btn');
    btn.disabled = true;
    btn.textContent = 'Searching...';

    socket.emit('find-opponent', currentUser);
}

function handleWaitingForOpponent(data) {
    currentGameId = data.gameId;
    const status = document.getElementById('game-status');
    status.textContent = 'Waiting for opponent...';
    status.style.background = '#fffacd';
    status.style.borderColor = '#f39c12';
}

function handleGameStart(data) {
    currentGameId = data.gameId;
    const playerSymbols = data.players;
    mySymbol = playerSymbols.find(p => p.socketId === socket.id)?.symbol;

    board = data.board.slice();
    currentTurn = data.currentTurn;
    gameActive = true;

    const status = document.getElementById('game-status');
    status.textContent = `Game Started! You are ${mySymbol}. Current Turn: ${currentTurn === mySymbol ? 'YOUR TURN' : "OPPONENT'S TURN"}`;
    status.style.background = '#e8f5e9';
    status.style.borderColor = '#27ae60';

    document.getElementById('game-board').style.display = 'grid';
    document.getElementById('find-opponent-btn').style.display = 'none';
    document.getElementById('new-game-btn').style.display = 'none';

    updateBoard();
}

// ========== Local 2-Player Functions ==========
function startLocalGame() {
    resetGame();
    gameMode = 'local';
    board = Array(9).fill(null);
    currentTurn = 'X';
    gameActive = true;
    localPlayer = 'X';

    const status = document.getElementById('game-status');
    status.textContent = `Player 1 (X) turn - Click a cell to place your mark`;
    status.style.background = '#e8f5e9';
    status.style.borderColor = '#27ae60';

    document.getElementById('game-board').style.display = 'grid';
    document.getElementById('start-local-btn').style.display = 'none';
    document.getElementById('new-game-btn').style.display = 'none';

    updateBoard();
}

// ========== CPU Game Functions ==========
function startCPUGame() {
    resetGame();
    gameMode = 'cpu';
    board = Array(9).fill(null);
    currentTurn = 'X';
    gameActive = true;
    mySymbol = 'X'; // Player is always X
    cpuSymbol = 'O'; // CPU is always O

    const status = document.getElementById('game-status');
    status.textContent = `You are X. Your turn - Click a cell to make your move`;
    status.style.background = '#e8f5e9';
    status.style.borderColor = '#27ae60';

    document.getElementById('game-board').style.display = 'grid';
    document.getElementById('start-cpu-btn').style.display = 'none';
    document.getElementById('new-game-btn').style.display = 'none';

    updateBoard();
}

// CPU AI - Simple minimax algorithm
function getCPUMove() {
    let bestScore = -Infinity;
    let bestMove;

    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = cpuSymbol;
            let score = minimax(board, 0, false);
            board[i] = null;

            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }

    return bestMove;
}

function minimax(testBoard, depth, isMaximizing) {
    const winner = checkWinner(testBoard);

    if (winner === cpuSymbol) return 10 - depth;
    if (winner === mySymbol) return depth - 10;
    if (testBoard.every(cell => cell !== null)) return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (testBoard[i] === null) {
                testBoard[i] = cpuSymbol;
                let score = minimax(testBoard, depth + 1, false);
                testBoard[i] = null;
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (testBoard[i] === null) {
                testBoard[i] = mySymbol;
                let score = minimax(testBoard, depth + 1, true);
                testBoard[i] = null;
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

// ========== Shared Game Functions ==========
function makeMove(position) {
    if (!gameActive) return;
    if (board[position] !== null) return;

    if (gameMode === 'multiplayer') {
        if (currentTurn !== mySymbol) return;
        socket.emit('make-move', { gameId: currentGameId, position });
    } else if (gameMode === 'local') {
        // Local 2-player mode
        board[position] = currentTurn;
        const winner = checkWinner(board);
        const isBoardFull = board.every(cell => cell !== null);

        updateBoard();

        if (winner) {
            gameActive = false;
            const status = document.getElementById('game-status');
            status.textContent = `🎉 Player ${winner === 'X' ? '1' : '2'} (${winner}) Won!`;
            status.style.background = '#c8e6c9';
            status.style.borderColor = '#27ae60';
            document.getElementById('new-game-btn').style.display = 'inline-block';
        } else if (isBoardFull) {
            gameActive = false;
            const status = document.getElementById('game-status');
            status.textContent = "It's a Draw!";
            status.style.background = '#e3f2fd';
            status.style.borderColor = '#2196f3';
            document.getElementById('new-game-btn').style.display = 'inline-block';
        } else {
            currentTurn = currentTurn === 'X' ? 'O' : 'X';
            const status = document.getElementById('game-status');
            status.textContent = `Player ${currentTurn === 'X' ? '1' : '2'} (${currentTurn}) turn`;
        }
    } else if (gameMode === 'cpu') {
        if (currentTurn !== mySymbol) return;

        board[position] = mySymbol;
        const winner = checkWinner(board);
        const isBoardFull = board.every(cell => cell !== null);

        updateBoard();

        if (winner) {
            gameActive = false;
            const status = document.getElementById('game-status');
            status.textContent = '🎉 You Won!';
            status.style.background = '#c8e6c9';
            status.style.borderColor = '#27ae60';
            document.getElementById('new-game-btn').style.display = 'inline-block';
            return;
        } else if (isBoardFull) {
            gameActive = false;
            const status = document.getElementById('game-status');
            status.textContent = "It's a Draw!";
            status.style.background = '#e3f2fd';
            status.style.borderColor = '#2196f3';
            document.getElementById('new-game-btn').style.display = 'inline-block';
            return;
        }

        // CPU Move
        currentTurn = cpuSymbol;
        const status = document.getElementById('game-status');
        status.textContent = 'CPU is thinking...';

        setTimeout(() => {
            const cpuMove = getCPUMove();
            board[cpuMove] = cpuSymbol;

            const cpuWinner = checkWinner(board);
            const cpuBoardFull = board.every(cell => cell !== null);

            updateBoard();

            if (cpuWinner) {
                gameActive = false;
                const status = document.getElementById('game-status');
                status.textContent = '😢 CPU Won!';
                status.style.background = '#ffcdd2';
                status.style.borderColor = '#e74c3c';
                document.getElementById('new-game-btn').style.display = 'inline-block';
            } else if (cpuBoardFull) {
                gameActive = false;
                const status = document.getElementById('game-status');
                status.textContent = "It's a Draw!";
                status.style.background = '#e3f2fd';
                status.style.borderColor = '#2196f3';
                document.getElementById('new-game-btn').style.display = 'inline-block';
            } else {
                currentTurn = mySymbol;
                const status = document.getElementById('game-status');
                status.textContent = 'Your turn - Click a cell to make your move';
                status.style.background = '#e8f5e9';
            }
        }, 500);
    }
}

function handleMoveMade(data) {
    board = data.board.slice();
    currentTurn = data.currentTurn;

    const status = document.getElementById('game-status');
    status.textContent = `Current Turn: ${currentTurn === mySymbol ? 'YOUR TURN' : "OPPONENT'S TURN"}`;

    updateBoard();
}

function updateBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        cell.textContent = board[index] || '';
        cell.style.color = board[index] === 'X' ? '#667eea' : '#e74c3c';
    });
}

function checkWinner(testBoard) {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];

    for (let line of lines) {
        const [a, b, c] = line;
        if (testBoard[a] && testBoard[a] === testBoard[b] && testBoard[a] === testBoard[c]) {
            return testBoard[a];
        }
    }
    return null;
}

function handleGameEnd(data) {
    gameActive = false;
    const status = document.getElementById('game-status');

    if (data.winner === 'draw') {
        status.textContent = "It's a Draw!";
        status.style.background = '#e3f2fd';
        status.style.borderColor = '#2196f3';
    } else if (data.winner === currentUser.username) {
        status.textContent = '🎉 You Won! Congratulations!';
        status.style.background = '#c8e6c9';
        status.style.borderColor = '#27ae60';
    } else {
        status.textContent = `😢 You Lost! ${data.winner} won the game.`;
        status.style.background = '#ffcdd2';
        status.style.borderColor = '#e74c3c';
    }

    board = data.board.slice();
    updateBoard();

    document.getElementById('new-game-btn').style.display = 'inline-block';
}

function handleInvalidMove() {
    alert('Invalid move!');
}

function newGame() {
    if (gameMode === 'local') {
        startLocalGame();
    } else if (gameMode === 'cpu') {
        startCPUGame();
    } else if (gameMode === 'multiplayer') {
        resetGame();
        findOpponent();
    }
}

function resetGame() {
    board = Array(9).fill(null);
    currentTurn = 'X';
    gameActive = false;
    mySymbol = null;
    currentGameId = null;

    document.getElementById('game-board').style.display = 'none';
    document.getElementById('game-status').textContent = gameMode ? 'Click "New Game" to play again' : 'Select a game mode';
    document.getElementById('game-status').style.background = '#f0f4ff';
    document.getElementById('game-status').style.borderColor = '#667eea';
    document.getElementById('find-opponent-btn').style.display = 'none';
    document.getElementById('find-opponent-btn').disabled = false;
    document.getElementById('find-opponent-btn').textContent = 'Find Opponent';
    document.getElementById('start-local-btn').style.display = 'none';
    document.getElementById('start-cpu-btn').style.display = 'none';
    document.getElementById('new-game-btn').style.display = 'none';

    updateBoard();
}

async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const leaderboard = await response.json();

        const tbody = document.getElementById('leaderboard-body');
        tbody.innerHTML = '';

        leaderboard.forEach((player, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${player.username}</strong></td>
                <td>${player.wins}</td>
                <td>${player.losses}</td>
                <td>${player.draws}</td>
                <td>${player.total}</td>
                <td>${player.winRate}%</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        document.getElementById('leaderboard-body').innerHTML = 
            '<tr><td colspan="7" class="loading">Error loading leaderboard</td></tr>';
    }
}

function loadAdminPanel() {
    if (!currentUser.isAdmin) {
        document.getElementById('admin-denied').style.display = 'block';
        document.getElementById('admin-content').style.display = 'none';
        return;
    }

    document.getElementById('admin-content').style.display = 'block';
    document.getElementById('admin-denied').style.display = 'none';

    loadAdminStats();
    loadAdminUsers();
}

async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const stats = await response.json();

        document.getElementById('stat-users').textContent = stats.totalUsers;
        document.getElementById('stat-games').textContent = stats.totalGames;
        document.getElementById('stat-online').textContent = stats.onlineUsers;
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

async function loadAdminUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const users = await response.json();

        const container = document.getElementById('users-management');
        container.innerHTML = '';

        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            const isCurrentUser = user.username === currentUser.username;
            
            let actionButtons = `
                <div class="user-card-actions">
                    <button class="btn btn-sm btn-warning" onclick="showResetPasswordModal('${user.username}')" ${isCurrentUser ? 'disabled' : ''}>Reset Password</button>
                    <button class="btn btn-sm btn-info" onclick="showChangeUsernameModal('${user.username}')" ${isCurrentUser ? 'disabled' : ''}>Change Username</button>
                    ${!user.isAdmin ? `<button class="btn btn-sm btn-success" onclick="adminMakeAdmin('${user.username}')" ${isCurrentUser ? 'disabled' : ''}>Make Admin</button>` : ''}
                    <button class="btn btn-sm btn-danger" onclick="adminDeleteUser('${user.username}')" ${isCurrentUser ? 'disabled' : ''}>Delete User</button>
                </div>
            `;
            
            userCard.innerHTML = `
                <div class="user-card-header">
                    <span class="user-card-name">${user.username}</span>
                    ${user.isAdmin ? '<span class="user-card-badge">ADMIN</span>' : ''}
                    ${isCurrentUser ? '<span class="user-card-badge">YOU</span>' : ''}
                </div>
                <div class="user-card-stats">
                    <div>Wins: <strong>${user.wins}</strong></div>
                    <div>Losses: <strong>${user.losses}</strong></div>
                    <div>Draws: <strong>${user.draws}</strong></div>
                    <div>Created: <strong>${new Date(user.createdAt).toLocaleDateString()}</strong></div>
                </div>
                ${actionButtons}
            `;
            container.appendChild(userCard);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('users-management').innerHTML = '<p class="loading">Error loading users</p>';
    }
}

async function handleCreateAdmin(event) {
    event.preventDefault();

    const newUsername = document.getElementById('new-admin-username').value;
    const newPassword = document.getElementById('new-admin-password').value;
    const messageEl = document.getElementById('admin-create-message');

    if (!newUsername || !newPassword) {
        messageEl.textContent = 'Username and password are required';
        messageEl.className = 'message error';
        return;
    }

    try {
        const response = await fetch('/api/admin/create-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminUsername: currentUser.username,
                newUsername,
                newPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            messageEl.textContent = data.error || 'Failed to create admin';
            messageEl.className = 'message error';
            return;
        }

        messageEl.textContent = `Admin account "${newUsername}" created successfully!`;
        messageEl.className = 'message success';

        document.getElementById('new-admin-username').value = '';
        document.getElementById('new-admin-password').value = '';

        setTimeout(() => {
            loadAdminUsers();
            loadAdminStats();
        }, 1000);
    } catch (error) {
        messageEl.textContent = 'An error occurred. Please try again.';
        messageEl.className = 'message error';
        console.error('Error creating admin:', error);
    }
}

// User Account Management Functions

async function handleChangePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const messageEl = document.getElementById('change-password-message');

    if (newPassword !== confirmPassword) {
        messageEl.textContent = 'New passwords do not match';
        messageEl.className = 'message error';
        return;
    }

    if (newPassword.length < 4) {
        messageEl.textContent = 'Password must be at least 4 characters';
        messageEl.className = 'message error';
        return;
    }

    try {
        const response = await fetch('/api/user/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser.username,
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            messageEl.textContent = data.error || 'Failed to change password';
            messageEl.className = 'message error';
            return;
        }

        messageEl.textContent = 'Password changed successfully!';
        messageEl.className = 'message success';

        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    } catch (error) {
        messageEl.textContent = 'An error occurred. Please try again.';
        messageEl.className = 'message error';
        console.error('Error changing password:', error);
    }
}

async function handleChangeUsername(event) {
    event.preventDefault();

    const newUsername = document.getElementById('new-username').value;
    const password = document.getElementById('confirm-password-username').value;
    const messageEl = document.getElementById('change-username-message');

    try {
        const response = await fetch('/api/user/change-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentUsername: currentUser.username,
                newUsername,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            messageEl.textContent = data.error || 'Failed to change username';
            messageEl.className = 'message error';
            return;
        }

        messageEl.textContent = 'Username changed successfully! Please log in again.';
        messageEl.className = 'message success';

        // Update localStorage with new user data
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        document.getElementById('username-display').textContent = data.user.username;

        document.getElementById('new-username').value = '';
        document.getElementById('confirm-password-username').value = '';
    } catch (error) {
        messageEl.textContent = 'An error occurred. Please try again.';
        messageEl.className = 'message error';
        console.error('Error changing username:', error);
    }
}

// Admin User Management Functions

function showResetPasswordModal(username) {
    const newPassword = prompt(`Enter new password for ${username}:`);
    if (newPassword !== null) {
        adminResetPassword(username, newPassword);
    }
}

function showChangeUsernameModal(username) {
    const newUsername = prompt(`Enter new username for ${username}:`);
    if (newUsername !== null) {
        adminChangeUsername(username, newUsername);
    }
}

async function adminResetPassword(targetUsername, newPassword) {
    try {
        const response = await fetch('/api/admin/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminUsername: currentUser.username,
                targetUsername,
                newPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Failed to reset password');
            return;
        }

        alert(`Password reset for ${targetUsername}!`);
        loadAdminUsers();
    } catch (error) {
        alert('An error occurred. Please try again.');
        console.error('Error resetting password:', error);
    }
}

async function adminChangeUsername(targetUsername, newUsername) {
    try {
        const response = await fetch('/api/admin/change-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminUsername: currentUser.username,
                targetUsername,
                newUsername
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Failed to change username');
            return;
        }

        alert(`Username changed to ${newUsername}!`);
        loadAdminUsers();
    } catch (error) {
        alert('An error occurred. Please try again.');
        console.error('Error changing username:', error);
    }
}

async function adminMakeAdmin(targetUsername) {
    if (!confirm(`Make ${targetUsername} an administrator?`)) {
        return;
    }

    try {
        const response = await fetch('/api/admin/make-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminUsername: currentUser.username,
                targetUsername
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Failed to make admin');
            return;
        }

        alert(`${targetUsername} is now an administrator!`);
        loadAdminUsers();
    } catch (error) {
        alert('An error occurred. Please try again.');
        console.error('Error making admin:', error);
    }
}

async function adminDeleteUser(targetUsername) {
    if (!confirm(`Are you sure you want to delete user ${targetUsername}? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminUsername: currentUser.username,
                targetUsername
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Failed to delete user');
            return;
        }

        alert(`User ${targetUsername} has been deleted!`);
        loadAdminUsers();
        loadAdminStats();
    } catch (error) {
        alert('An error occurred. Please try again.');
        console.error('Error deleting user:', error);
    }
}

function handleLogout() {
    localStorage.removeItem('user');
    socket.disconnect();
    window.location.href = '/index.html';
}
