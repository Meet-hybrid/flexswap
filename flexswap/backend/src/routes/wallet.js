const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { FX_RATES, CURRENCIES } = require("../config/constants");
const { asyncHandler } = require("../middleware/errorHandler");

const getUser = (id, res) => {
  const user = global.store.users.get(id);
  if (!user) { res.status(404).json({ error: "User not found" }); return null; }
  return user;
};

// ─── GET /api/wallet/balance ─────────────────────────────────────────────────
router.get("/balance", (req, res) => {
  const user = getUser(req.user.id, res);
  if (!user) return;

  const totalNgn = user.wallet_ngn
    + (user.wallet_usdt * FX_RATES.USDT_NGN)
    + (user.wallet_btc  * FX_RATES.BTC_NGN);

  res.json({
    ngn:               user.wallet_ngn,
    usdt:              user.wallet_usdt,
    btc:               user.wallet_btc,
    escrow:            user.wallet_escrow,
    total_ngn_equivalent: Math.round(totalNgn),
    fx_rates:          { USDT_NGN: FX_RATES.USDT_NGN, BTC_NGN: FX_RATES.BTC_NGN },
    updated_at:        new Date().toISOString(),
  });
});

// ─── POST /api/wallet/deposit — Simulate top-up (in production: Paystack webhook) ─
router.post("/deposit", asyncHandler(async (req, res) => {
  const { amount, currency = "NGN", reference } = req.body;
  const user = getUser(req.user.id, res);
  if (!user) return;

  const amt = parseFloat(amount);
  if (!amt || amt <= 0)  return res.status(400).json({ error: "Invalid amount" });
  if (!CURRENCIES.includes(currency.toUpperCase()))
    return res.status(400).json({ error: `Supported currencies: ${CURRENCIES.join(", ")}` });

  const key = `wallet_${currency.toLowerCase()}`;
  user[key] = (user[key] || 0) + amt;

  res.json({
    message:     `Deposit of ${amt} ${currency} successful`,
    amount:      amt,
    currency,
    new_balance: user[key],
    reference:   reference || `DEP-${Date.now()}`,
  });
}));

// ─── POST /api/wallet/withdraw ───────────────────────────────────────────────
router.post("/withdraw", asyncHandler(async (req, res) => {
  const { amount, currency = "NGN", bank_account, bank_name } = req.body;
  const user = getUser(req.user.id, res);
  if (!user) return;

  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: "Invalid amount" });
  if (amt < 500)        return res.status(400).json({ error: "Minimum withdrawal is ₦500" });

  const key = `wallet_${currency.toLowerCase()}`;
  if (user[key] === undefined) return res.status(400).json({ error: `Unsupported currency: ${currency}` });
  if (user[key] < amt)         return res.status(400).json({ error: `Insufficient ${currency} balance. Available: ${user[key]}` });

  user[key] -= amt;

  // In production: initiate Paystack transfer here
  res.json({
    message:     `Withdrawal of ${amt} ${currency} initiated`,
    amount:      amt,
    currency,
    new_balance: user[key],
    reference:   `WD-${uuidv4().slice(0, 8).toUpperCase()}`,
    eta:         currency === "NGN" ? "5–10 minutes" : "10–30 minutes",
    bank_account: bank_account || user.bank_account || "on file",
    bank_name:   bank_name    || user.bank_name    || "on file",
  });
}));

// ─── POST /api/wallet/convert ────────────────────────────────────────────────
router.post("/convert", asyncHandler(async (req, res) => {
  const { from, to, amount } = req.body;
  const user = getUser(req.user.id, res);
  if (!user) return;

  if (!from || !to || !amount)
    return res.status(400).json({ error: "from, to, and amount are required" });
  if (from === to)
    return res.status(400).json({ error: "from and to currencies must be different" });

  const rateKey = `${from.toUpperCase()}_${to.toUpperCase()}`;
  const rate    = FX_RATES[rateKey];
  if (!rate)
    return res.status(400).json({ error: `Conversion ${from} → ${to} is not supported` });

  const amt     = parseFloat(amount);
  const fromKey = `wallet_${from.toLowerCase()}`;
  const toKey   = `wallet_${to.toLowerCase()}`;

  if (user[fromKey] === undefined) return res.status(400).json({ error: `Invalid from currency: ${from}` });
  if (user[toKey]   === undefined) return res.status(400).json({ error: `Invalid to currency: ${to}` });
  if (user[fromKey] < amt)         return res.status(400).json({ error: `Insufficient ${from} balance` });

  const received = amt * rate;
  user[fromKey] -= amt;
  user[toKey]    = (user[toKey] || 0) + received;

  res.json({
    message:  `Converted ${amt} ${from} → ${received.toFixed(6)} ${to}`,
    from:     { currency: from, amount: amt,      new_balance: user[fromKey] },
    to:       { currency: to,   amount: received, new_balance: user[toKey]   },
    rate:     rate,
    reference: `CV-${uuidv4().slice(0, 8).toUpperCase()}`,
  });
}));

// ─── GET /api/wallet/transactions — Stub for future tx history ───────────────
router.get("/transactions", (req, res) => {
  // In production: query a transactions table from PostgreSQL
  res.json({
    message:      "Transaction history coming soon. Connect PostgreSQL for persistent tx logs.",
    transactions: [],
    total:        0,
  });
});

module.exports = router;
