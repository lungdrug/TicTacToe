# Tic Tac Toe Multiplayer Game

A fully-featured multiplayer tic tac toe game with user authentication, admin panel, leaderboard, and real-time online user tracking.

## Features

- **User Authentication**: Register and login system with secure password hashing
- **Multiplayer Gameplay**: Real-time multiplayer games using WebSockets
- **Online Users**: See all users currently online
- **Leaderboard**: Global leaderboard tracking wins, losses, and draws
- **Admin Panel**: Admin-only dashboard to view statistics
- **Default Admin Account**: 
  - Username: `admin`
  - Password: `admin`

## Installation

1. Navigate to the project directory
2. Install dependencies:
```bash
npm install
```

## Running the Application

Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## How to Play

1. **Login/Register**: Create an account or use the default admin credentials
2. **Find Opponent**: Click "Find Opponent" to search for another player
3. **Play**: Take turns placing X's and O's on the board
4. **View Stats**: Check the leaderboard to see player rankings
5. **Admin Panel**: If you're an admin, view system statistics

## Project Structure

```
├── server.js           # Main server file with Express and Socket.io
├── package.json        # Project dependencies
├── data/              # Database files (users.json, games.json)
└── public/            # Frontend files
    ├── index.html     # Login/Register page
    ├── dashboard.html # Main game interface
    ├── style.css      # Styling
    ├── auth.js        # Authentication logic
    └── game.js        # Game logic
```

## Technologies Used

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: HTML, CSS, JavaScript
- **Security**: bcryptjs for password hashing
- **Database**: JSON files (can be upgraded to MongoDB/SQLite)

## Default Admin Credentials

- Username: `admin`
- Password: `admin`

**Important**: Change the admin password after first login in a production environment!
