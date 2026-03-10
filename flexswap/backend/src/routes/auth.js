const router   = require("express").Router();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { JWT_SECRET, JWT_EXPIRY } = require("../config/constants");
const { authMiddleware }         = require("../middleware/auth");
const { asyncHandler }           = require("../middleware/errorHandler");

const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
const sanitize  = ({ password_hash, ...rest }) => rest;

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post("/register", asyncHandler(async (req, res) => {
  const { username, email, password, phone } = req.body;

  if (!username?.trim() || !email?.trim() || !password)
    return res.status(400).json({ error: "username, email, and password are required" });

  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters" });

  const emailExists = [...global.store.users.values()].find(u => u.email === email.toLowerCase());
  if (emailExists) return res.status(409).json({ error: "Email already registered" });

  const usernameExists = [...global.store.users.values()].find(u => u.username === username);
  if (usernameExists) return res.status(409).json({ error: "Username already taken" });

  const user = {
    id:            uuidv4(),
    username:      username.trim(),
    email:         email.toLowerCase().trim(),
    phone:         phone || null,
    password_hash: await bcrypt.hash(password, 12),
    rep_score:     5.0,
    total_trades:  0,
    badge:         "New Trader",
    is_verified:   false,
    wallet_ngn:    0,
    wallet_usdt:   0,
    wallet_btc:    0,
    wallet_escrow: 0,
    created_at:    new Date(),
    updated_at:    new Date(),
  };

  global.store.users.set(user.id, user);

  const token = signToken({ id: user.id, username: user.username });
  res.status(201).json({ token, user: sanitize(user) });
}));

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password required" });

  const user = [...global.store.users.values()].find(u => u.email === email.toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken({ id: user.id, username: user.username });
  res.json({ token, user: sanitize(user) });
}));

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get("/me", authMiddleware, (req, res) => {
  const user = global.store.users.get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(sanitize(user));
});

// ─── PUT /api/auth/profile ───────────────────────────────────────────────────
router.put("/profile", authMiddleware, asyncHandler(async (req, res) => {
  const user = global.store.users.get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { phone, bank_name, bank_account } = req.body;
  if (phone)        user.phone        = phone;
  if (bank_name)    user.bank_name    = bank_name;
  if (bank_account) user.bank_account = bank_account;
  user.updated_at = new Date();

  res.json(sanitize(user));
}));

module.exports = router;
