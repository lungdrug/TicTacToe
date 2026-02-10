const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Database files
const usersFile = path.join(__dirname, 'data', 'users.json');
const gamesFile = path.join(__dirname, 'data', 'games.json');
const dataDir = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data files if they don't exist
if (!fs.existsSync(usersFile)) {
  const hashedPassword = bcrypt.hashSync('admin', 10);
  fs.writeFileSync(usersFile, JSON.stringify([
    {
      id: uuidv4(),
      username: 'admin',
      password: hashedPassword,
      isAdmin: true,
      wins: 0,
      losses: 0,
      draws: 0,
      createdAt: new Date().toISOString()
    }
  ], null, 2));
}

if (!fs.existsSync(gamesFile)) {
  fs.writeFileSync(gamesFile, JSON.stringify([], null, 2));
}

// Online users tracking
const onlineUsers = new Map();
const activeGames = new Map();

// Helper functions
function getUsers() {
  return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function getGames() {
  return JSON.parse(fs.readFileSync(gamesFile, 'utf-8'));
}

function saveGames(games) {
  fs.writeFileSync(gamesFile, JSON.stringify(games, null, 2));
}

function findUser(username) {
  return getUsers().find(u => u.username === username);
}

// Routes
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const users = getUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    isAdmin: false,
    wins: 0,
    losses: 0,
    draws: 0,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  res.json({
    success: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      isAdmin: newUser.isAdmin,
      wins: newUser.wins,
      losses: newUser.losses,
      draws: newUser.draws
    }
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = findUser(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws
    }
  });
});

app.get('/api/leaderboard', (req, res) => {
  const users = getUsers();
  const leaderboard = users
    .map(user => ({
      username: user.username,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      total: user.wins + user.losses + user.draws,
      winRate: user.wins + user.losses + user.draws > 0 
        ? (user.wins / (user.wins + user.losses + user.draws) * 100).toFixed(2)
        : 0
    }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 20);

  res.json(leaderboard);
});

app.get('/api/online-users', (req, res) => {
  const onlineList = Array.from(onlineUsers.values()).map(user => ({
    username: user.username,
    id: user.id
  }));
  res.json(onlineList);
});

app.get('/api/admin/stats', (req, res) => {
  const users = getUsers();
  const totalGames = getGames().length;
  res.json({
    totalUsers: users.length,
    totalGames,
    onlineUsers: onlineUsers.size
  });
});

app.get('/api/admin/users', (req, res) => {
  const users = getUsers();
  const usersList = users.map(user => ({
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    wins: user.wins,
    losses: user.losses,
    draws: user.draws,
    createdAt: user.createdAt
  }));
  res.json(usersList);
});

app.post('/api/admin/create-admin', (req, res) => {
  const { adminUsername, newUsername, newPassword } = req.body;
  
  const adminUser = findUser(adminUsername);
  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({ error: 'Only admins can create new admin accounts' });
  }

  const users = getUsers();
  if (users.find(u => u.username === newUsername)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const newAdmin = {
    id: uuidv4(),
    username: newUsername,
    password: hashedPassword,
    isAdmin: true,
    wins: 0,
    losses: 0,
    draws: 0,
    createdAt: new Date().toISOString()
  };

  users.push(newAdmin);
  saveUsers(users);

  res.json({
    success: true,
    admin: {
      id: newAdmin.id,
      username: newAdmin.username,
      isAdmin: newAdmin.isAdmin
    }
  });
});

// User Account Management Routes

// Change user password
app.post('/api/user/change-password', (req, res) => {
  const { username, currentPassword, newPassword } = req.body;

  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const users = getUsers();
  const user = users.find(u => u.username === username);

  if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }

  user.password = bcrypt.hashSync(newPassword, 10);
  saveUsers(users);

  res.json({ success: true, message: 'Password changed successfully' });
});

// Change user username
app.post('/api/user/change-username', (req, res) => {
  const { currentUsername, newUsername, password } = req.body;

  if (!currentUsername || !newUsername || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const users = getUsers();
  const user = users.find(u => u.username === currentUsername);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Password is incorrect' });
  }

  if (users.find(u => u.username === newUsername)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  user.username = newUsername;
  saveUsers(users);

  res.json({ 
    success: true, 
    message: 'Username changed successfully',
    user: {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws
    }
  });
});

// Admin Routes for User Management

// Reset user password (admin only)
app.post('/api/admin/reset-password', (req, res) => {
  const { adminUsername, targetUsername, newPassword } = req.body;

  if (!adminUsername || !targetUsername || !newPassword) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const users = getUsers();
  const adminUser = users.find(u => u.username === adminUsername);

  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({ error: 'Only admins can reset passwords' });
  }

  const targetUser = users.find(u => u.username === targetUsername);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  targetUser.password = bcrypt.hashSync(newPassword, 10);
  saveUsers(users);

  res.json({ success: true, message: `Password reset for ${targetUsername}` });
});

// Change user username (admin only)
app.post('/api/admin/change-username', (req, res) => {
  const { adminUsername, targetUsername, newUsername } = req.body;

  if (!adminUsername || !targetUsername || !newUsername) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const users = getUsers();
  const adminUser = users.find(u => u.username === adminUsername);

  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({ error: 'Only admins can change usernames' });
  }

  const targetUser = users.find(u => u.username === targetUsername);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (users.find(u => u.username === newUsername)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  targetUser.username = newUsername;
  saveUsers(users);

  res.json({ success: true, message: `Username changed to ${newUsername}` });
});

// Delete user account (admin only)
app.post('/api/admin/delete-user', (req, res) => {
  const { adminUsername, targetUsername } = req.body;

  if (!adminUsername || !targetUsername) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const users = getUsers();
  const adminUser = users.find(u => u.username === adminUsername);

  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({ error: 'Only admins can delete users' });
  }

  if (adminUsername === targetUsername) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const targetIndex = users.findIndex(u => u.username === targetUsername);
  if (targetIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users.splice(targetIndex, 1);
  saveUsers(users);

  res.json({ success: true, message: `User ${targetUsername} deleted` });
});

// Make user administrator (admin only)
app.post('/api/admin/make-admin', (req, res) => {
  const { adminUsername, targetUsername } = req.body;

  if (!adminUsername || !targetUsername) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const users = getUsers();
  const adminUser = users.find(u => u.username === adminUsername);

  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({ error: 'Only admins can create new admins' });
  }

  const targetUser = users.find(u => u.username === targetUsername);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (targetUser.isAdmin) {
    return res.status(400).json({ error: 'User is already an admin' });
  }

  targetUser.isAdmin = true;
  saveUsers(users);

  res.json({ success: true, message: `${targetUsername} is now an administrator` });
});

// Socket.io events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User login via socket
  socket.on('user-login', (userData) => {
    onlineUsers.set(socket.id, {
      id: userData.id,
      username: userData.username,
      socketId: socket.id,
      isAdmin: userData.isAdmin
    });

    // Broadcast online users update
    io.emit('users-online', Array.from(onlineUsers.values()).map(u => ({
      username: u.username,
      id: u.id
    })));

    socket.emit('login-success', { username: userData.username });
  });

  // Find opponent for gameplay
  socket.on('find-opponent', (userData) => {
    const socketUser = onlineUsers.get(socket.id);
    if (!socketUser) return;

    // Create a game room
    const gameId = uuidv4();
    const gameRoom = `game_${gameId}`;

    socket.join(gameRoom);
    socket.emit('waiting-for-opponent', { gameId, gameRoom });

    activeGames.set(gameRoom, {
      gameId,
      players: [
        { socketId: socket.id, id: socketUser.id, username: socketUser.username, symbol: 'X' }
      ],
      board: Array(9).fill(null),
      currentTurn: 'X',
      status: 'waiting'
    });

    // Notify other users that this user is looking for opponent
    socket.broadcast.emit('user-searching', { username: socketUser.username });
  });

  // Accept game invitation
  socket.on('accept-game', (gameId) => {
    const gameRoom = `game_${gameId}`;
    const game = activeGames.get(gameRoom);

    if (game && game.players.length === 1) {
      const socketUser = onlineUsers.get(socket.id);
      if (!socketUser) return;

      socket.join(gameRoom);
      game.players.push({
        socketId: socket.id,
        id: socketUser.id,
        username: socketUser.username,
        symbol: 'O'
      });
      game.status = 'playing';

      io.to(gameRoom).emit('game-start', {
        gameId,
        players: game.players,
        board: game.board,
        currentTurn: game.currentTurn
      });

      io.emit('users-online', Array.from(onlineUsers.values()).map(u => ({
        username: u.username,
        id: u.id
      })));
    }
  });

  // Handle game moves
  socket.on('make-move', ({ gameId, position }) => {
    const gameRoom = `game_${gameId}`;
    const game = activeGames.get(gameRoom);

    if (!game) return;

    const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
    if (playerIndex === -1) return;

    const player = game.players[playerIndex];

    // Validate move
    if (game.board[position] !== null || game.currentTurn !== player.symbol) {
      socket.emit('invalid-move');
      return;
    }

    game.board[position] = player.symbol;

    // Check for winner
    const winner = checkWinner(game.board);
    const isBoardFull = game.board.every(cell => cell !== null);

    if (winner) {
      game.status = 'finished';
      const winnerPlayer = game.players.find(p => p.symbol === winner);

      // Update player stats
      const users = getUsers();
      const winnerUser = users.find(u => u.id === winnerPlayer.id);
      const loserUser = users.find(u => u.id === game.players.find(p => p.id !== winnerPlayer.id).id);

      if (winnerUser) winnerUser.wins++;
      if (loserUser) loserUser.losses++;

      saveUsers(users);

      // Save game record
      const games = getGames();
      games.push({
        gameId,
        players: game.players.map(p => ({ id: p.id, username: p.username })),
        winner: winnerPlayer.username,
        date: new Date().toISOString()
      });
      saveGames(games);

      io.to(gameRoom).emit('game-end', {
        winner: winnerPlayer.username,
        board: game.board
      });

      activeGames.delete(gameRoom);
    } else if (isBoardFull) {
      game.status = 'finished';

      // Update player stats (draw)
      const users = getUsers();
      game.players.forEach(player => {
        const user = users.find(u => u.id === player.id);
        if (user) user.draws++;
      });
      saveUsers(users);

      const games = getGames();
      games.push({
        gameId,
        players: game.players.map(p => ({ id: p.id, username: p.username })),
        winner: 'draw',
        date: new Date().toISOString()
      });
      saveGames(games);

      io.to(gameRoom).emit('game-end', {
        winner: 'draw',
        board: game.board
      });

      activeGames.delete(gameRoom);
    } else {
      game.currentTurn = game.currentTurn === 'X' ? 'O' : 'X';

      io.to(gameRoom).emit('move-made', {
        board: game.board,
        currentTurn: game.currentTurn
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);

    console.log('User disconnected:', socket.id);

    // Notify others
    io.emit('users-online', Array.from(onlineUsers.values()).map(u => ({
      username: u.username,
      id: u.id
    })));

    if (user) {
      io.emit('user-disconnected', { username: user.username });
    }
  });
});

// Helper function to check winner
function checkWinner(board) {
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
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
