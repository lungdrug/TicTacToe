let socket;

document.addEventListener('DOMContentLoaded', () => {
    socket = io();

    // Check if already logged in
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        redirectToDashboard();
    }
});

function toggleForm() {
    document.getElementById('login-form').classList.toggle('active');
    document.getElementById('register-form').classList.toggle('active');
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
}

async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            errorEl.textContent = data.error || 'Login failed';
            return;
        }

        localStorage.setItem('user', JSON.stringify(data.user));
        socket.emit('user-login', data.user);
        redirectToDashboard();
    } catch (error) {
        errorEl.textContent = 'An error occurred. Please try again.';
        console.error('Login error:', error);
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const errorEl = document.getElementById('register-error');

    if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match';
        return;
    }

    if (password.length < 4) {
        errorEl.textContent = 'Password must be at least 4 characters';
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            errorEl.textContent = data.error || 'Registration failed';
            return;
        }

        localStorage.setItem('user', JSON.stringify(data.user));
        socket.emit('user-login', data.user);
        redirectToDashboard();
    } catch (error) {
        errorEl.textContent = 'An error occurred. Please try again.';
        console.error('Register error:', error);
    }
}

function redirectToDashboard() {
    window.location.href = '/dashboard.html';
}
