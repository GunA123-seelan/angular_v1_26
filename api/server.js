/**
 * Node.js API - JWT Cookie Auth
 * Run: npm install && npm start
 * Server: http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

// Use a secret in production from env (e.g. process.env.JWT_SECRET)
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-change-in-prod';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-prod';

// Access token: 10 minutes. Refresh token: 7 days
const ACCESS_EXPIRY = '2m';
const REFRESH_EXPIRY = '7d';

// In memory store for refresh tokens (use DB in production)
const refreshTokens = new Map();
// Store 4-digit passkey per username (valid username = "guna")
const passkeys = new Map();

app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

// --- Auth routes ---

// POST /api/auth/check-username - body: { username } - only "guna" is valid, returns 4-digit passkey
const VALID_USERNAME = 'guna';
app.post('/api/auth/check-username', (req, res) => {
  console.log("check-username request", req.body);
  const { username } = req.body || {};
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ valid: false, error: 'Username required' });
  }
  const normalized = username.trim().toLowerCase();
  if (normalized !== VALID_USERNAME) {
    return res.json({ valid: false });
  }
  const passkey = String(Math.floor(1000 + Math.random() * 9000));
  passkeys.set(normalized, { passkey });
  res.json({ valid: true, passkey });
});

// POST /api/auth/login - body: { username, password } - password = 4-digit passkey from check-username
app.post('/api/auth/login', (req, res) => {
  console.log("login request", req.body);
  const { username, password } = req.body || {};
  if (!username || password === undefined || password === null) {
    return res.status(400).json({ error: 'Username and passkey required' });
  }
  const normalized = username.trim().toLowerCase();
  const stored = passkeys.get(normalized);
  if (!stored || String(password).trim() !== stored.passkey) {
    return res.status(401).json({ error: 'Invalid username or passkey' });
  }
  passkeys.delete(normalized);

  const user = { id: '1', username: normalized };
  const accessToken = jwt.sign(
    { userId: user.id, username: user.username },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { userId: user.id, username: user.username },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
  refreshTokens.set(refreshToken, user.id);

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  res.json({ user: { id: user.id, username: user.username } });
});

// POST /api/auth/refresh - uses refreshToken cookie
app.post('/api/auth/refresh', (req, res) => {
  console.log("refresh request", req.cookies);
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }
  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const accessToken = jwt.sign(
      { userId: payload.userId, username: payload.username },
      ACCESS_SECRET,
      { expiresIn: ACCESS_EXPIRY }
    );
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000
    });
    res.json({ ok: true });
  } catch (e) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: 'Refresh token expired' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ ok: true });
});

// Middleware: verify access token from cookie
function authMiddleware(req, res, next) {
  console.log("authMiddleware request", req.cookies);
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(token, ACCESS_SECRET);
    console.log("authMiddleware request", req.user);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

// Protected route - dashboard data
app.get('/api/dashboard', authMiddleware, (req, res) => {
  console.log("dashboard request", req.user);
  res.json({
    message: 'Dashboard data',
    user: req.user
  });
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
