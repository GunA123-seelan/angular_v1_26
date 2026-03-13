/**
 * Node.js API - JWT Auth + Products, Cart, Orders
 * Run: npm install && npm start
 * Server: http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-change-in-prod';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-prod';
const ACCESS_EXPIRY = '3m';
const REFRESH_EXPIRY = '7d';
const REFRESH_BEFORE_EXPIRY_SEC = 60; // refresh 1 min before expiry

const refreshTokens = new Map();
const passkeys = new Map();

// In-memory data (use DB in production)
const products = new Map([
  ['1', { id: '1', name: 'Product One', price: 299, image: 'https://picsum.photos/seed/1/400/300', description: 'Description one' }],
  ['2', { id: '2', name: 'Product Two', price: 499, image: 'https://picsum.photos/seed/2/400/300', description: 'Description two' }],
  ['3', { id: '3', name: 'Product Three', price: 199, image: 'https://picsum.photos/seed/3/400/300', description: 'Description three' }],
  ['4', { id: '4', name: 'Product Four', price: 899, image: 'https://picsum.photos/seed/4/400/300', description: 'Description four' }],
  ['5', { id: '5', name: 'Product Five', price: 599, image: 'https://picsum.photos/seed/5/400/300', description: 'Description five' }]
]);
const cartByUser = new Map(); // userId -> { items: [{ productId, quantity }] }
const ordersByUser = new Map(); // userId -> [ { id, items, delivery, total, createdAt } ]
let orderIdCounter = 1;

app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) cb(null, origin || true);
    else cb(null, false);
  },
  credentials: true
}));

// --- Auth ---
const VALID_USERNAME = 'guna';
app.post('/api/auth/check-username', (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== 'string') return res.status(400).json({ valid: false, error: 'Username required' });
  const normalized = username.trim().toLowerCase();
  if (normalized !== VALID_USERNAME) return res.json({ valid: false });
  const passkey = String(Math.floor(1000 + Math.random() * 9000));
  passkeys.set(normalized, { passkey });
  res.json({ valid: true, passkey });
});

function getAccessTokenExpiresAt() {
  return Math.floor(Date.now() / 1000) + 600; // 10 min from now
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || password === undefined || password === null) return res.status(400).json({ error: 'Username and passkey required' });
  const normalized = username.trim().toLowerCase();
  const stored = passkeys.get(normalized);
  if (!stored || String(password).trim() !== stored.passkey) return res.status(401).json({ error: 'Invalid username or passkey' });
  passkeys.delete(normalized);

  const user = { id: '1', username: normalized };
  const accessToken = jwt.sign({ userId: user.id, username: user.username }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign({ userId: user.id, username: user.username }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
  refreshTokens.set(refreshToken, user.id);

  const expiresAt = getAccessTokenExpiresAt();
  res.cookie('accessToken', accessToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ user: { id: user.id, username: user.username }, expiresAt });
});

app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });
  if (!refreshTokens.has(refreshToken)) return res.status(401).json({ error: 'Invalid refresh token' });
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const accessToken = jwt.sign({ userId: payload.userId, username: payload.username }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
    const expiresAt = getAccessTokenExpiresAt();
    res.cookie('accessToken', accessToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
    res.json({ ok: true, expiresAt });
  } catch (e) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: 'Refresh token expired' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ ok: true });
});

function authMiddleware(req, res, next) {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, ACCESS_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

app.get('/api/dashboard', authMiddleware, (req, res) => {
  res.json({ message: 'Dashboard', user: req.user });
});

// --- Products CRUD (protected for write) ---
app.get('/api/products', (req, res) => {
  res.json(Array.from(products.values()));
});

app.get('/api/products/:id', (req, res) => {
  const p = products.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

app.post('/api/products', authMiddleware, (req, res) => {
  const { name, price, image, description } = req.body || {};
  const id = String(Date.now());
  const product = { id, name: name || 'Product', price: Number(price) || 0, image: image || '', description: description || '' };
  products.set(id, product);
  res.status(201).json(product);
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const p = products.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  const { name, price, image, description } = req.body || {};
  if (name !== undefined) p.name = name;
  if (price !== undefined) p.price = Number(price);
  if (image !== undefined) p.image = image;
  if (description !== undefined) p.description = description;
  res.json(p);
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  if (!products.has(req.params.id)) return res.status(404).json({ error: 'Product not found' });
  products.delete(req.params.id);
  res.status(204).send();
});

// --- Cart (auth) ---
function getCart(userId) {
  if (!cartByUser.has(userId)) cartByUser.set(userId, { items: [] });
  return cartByUser.get(userId);
}

app.get('/api/cart', authMiddleware, (req, res) => {
  const cart = getCart(req.user.userId);
  const items = (cart.items || []).map(({ productId, quantity }) => {
    const p = products.get(productId);
    return p ? { ...p, quantity } : null;
  }).filter(Boolean);
  res.json({ items });
});

app.post('/api/cart', authMiddleware, (req, res) => {
  const { productId, quantity = 1 } = req.body || {};
  if (!productId || !products.has(productId)) return res.status(400).json({ error: 'Invalid product' });
  const cart = getCart(req.user.userId);
  const existing = (cart.items || []).find(i => i.productId === productId);
  if (existing) existing.quantity += Number(quantity) || 1;
  else cart.items.push({ productId, quantity: Number(quantity) || 1 });
  res.json(getCart(req.user.userId));
});

app.put('/api/cart/items/:productId', authMiddleware, (req, res) => {
  const { quantity } = req.body || {};
  const cart = getCart(req.user.userId);
  const item = (cart.items || []).find(i => i.productId === req.params.productId);
  if (!item) return res.status(404).json({ error: 'Item not in cart' });
  const q = Number(quantity);
  if (q <= 0) { cart.items = cart.items.filter(i => i.productId !== req.params.productId); return res.json(getCart(req.user.userId)); }
  item.quantity = q;
  res.json(getCart(req.user.userId));
});

app.delete('/api/cart/items/:productId', authMiddleware, (req, res) => {
  const cart = getCart(req.user.userId);
  cart.items = (cart.items || []).filter(i => i.productId !== req.params.productId);
  res.json(getCart(req.user.userId));
});

// --- Orders (auth) ---
app.post('/api/orders', authMiddleware, (req, res) => {
  const { items: reqItems, delivery } = req.body || {};
  const userId = req.user.userId;
  const cart = getCart(userId);
  const items = (reqItems && reqItems.length) ? reqItems : (cart.items || []).map(i => ({ productId: i.productId, quantity: i.quantity }));
  if (!items.length) return res.status(400).json({ error: 'No items' });
  const orderItems = items.map(({ productId, quantity }) => {
    const p = products.get(productId);
    return p ? { productId: p.id, name: p.name, price: p.price, quantity: Number(quantity) || 1 } : null;
  }).filter(Boolean);
  const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const order = {
    id: String(orderIdCounter++),
    items: orderItems,
    delivery: delivery || { address: '', city: '', pincode: '' },
    total,
    createdAt: new Date().toISOString()
  };
  if (!ordersByUser.has(userId)) ordersByUser.set(userId, []);
  ordersByUser.get(userId).push(order);
  cart.items = [];
  res.status(201).json(order);
});

app.get('/api/orders', authMiddleware, (req, res) => {
  const list = ordersByUser.get(req.user.userId) || [];
  res.json(list);
});

app.get('/api/orders/:id', authMiddleware, (req, res) => {
  const list = ordersByUser.get(req.user.userId) || [];
  const order = list.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
