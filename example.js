const express = require('express');
const session = require('express-session');

// example.js - Node.js/Express Backend
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret_key', resave: false, saveUninitialized: true }));
app.use(express.static('public'));

const users = [{ username: 'lungdrug', password: 'password12', role: 'admin' }];
const scores = {};

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        req.session.user = user;
        res.json({ success: true, role: user.role });
    } else {
        res.json({ success: false });
    }
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) {
        return res.json({ success: false, message: 'User exists' });
    }
    users.push({ username, password, role: 'user' });
    res.json({ success: true });
});

app.get('/scores', (req, res) => res.json(scores));

app.post('/score', (req, res) => {
    if (!req.session.user) return res.json({ success: false });
    const { winner } = req.body;
    if (!scores[winner]) scores[winner] = 0;
    scores[winner]++;
    res.json({ success: true });
});

app.get('/users', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.json({ success: false });
    }
    res.json(users);
});

app.listen(3000, () => console.log('Server running on port 3000'));