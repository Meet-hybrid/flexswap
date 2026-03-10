const router = require("express").Router();
const { USD_TO_NGN, PLATFORM_FEE } = require("../config/constants");
const { asyncHandler } = require("../middleware/errorHandler");

// Simulate live rate drift (±0.3%)
const liveRate = (base) => parseFloat((base + (Math.random() - 0.5) * 0.006).toFixed(4));

// ─── GET /api/cards ───────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const { category, search, sort = "volume" } = req.query;

  let cards = [...global.store.cardTypes.values()];

  if (category && category !== "All")
    cards = cards.filter(c => c.category === category);

  if (search)
    cards = cards.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  // Simulate live rates
  cards = cards.map(c => ({ ...c, rate: liveRate(c.baseRate) }));

  // Sort
  if (sort === "rate")    cards.sort((a, b) => b.rate - a.rate);
  if (sort === "volume")  cards.sort((a, b) => b.volume - a.volume);
  if (sort === "change")  cards.sort((a, b) => b.change - a.change);

  res.json({ cards, total: cards.length, timestamp: new Date().toISOString() });
});

// ─── GET /api/cards/:id ───────────────────────────────────────────────────────
router.get("/:id", asyncHandler(async (req, res) => {
  const card = global.store.cardTypes.get(req.params.id);
  if (!card) return res.status(404).json({ error: "Card type not found" });

  // Generate 30-day rate history
  const history = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0],
    rate: parseFloat((card.baseRate + (Math.random() - 0.5) * 0.04).toFixed(4)),
    volume: Math.floor(card.volume * (0.7 + Math.random() * 0.6)),
  }));

  // Active listings for this card
  const activeListings = [...global.store.listings.values()]
    .filter(l => l.card_type_id === req.params.id && l.status === "active").length;

  res.json({ ...card, rate: liveRate(card.baseRate), active_listings: activeListings, rate_history: history });
}));

// ─── GET /api/cards/:id/price?amount=100&currency=USD ─────────────────────────
router.get("/:id/price", (req, res) => {
  const card = global.store.cardTypes.get(req.params.id);
  if (!card) return res.status(404).json({ error: "Card type not found" });

  const amount     = parseFloat(req.query.amount) || 100;
  const currentRate = liveRate(card.baseRate);
  const nairaValue  = amount * USD_TO_NGN * currentRate;
  const fee         = nairaValue * PLATFORM_FEE;

  res.json({
    card:           card.name,
    denomination:   amount,
    currency:       "USD",
    usd_ngn_rate:   USD_TO_NGN,
    card_rate:      currentRate,
    rate_pct:       `${(currentRate * 100).toFixed(0)}%`,
    naira_value:    Math.round(nairaValue),
    platform_fee:   Math.round(fee),
    seller_receives: Math.round(nairaValue - fee),
    breakdown: {
      usd_face_value:  amount,
      times_usd_rate:  USD_TO_NGN,
      times_card_rate: currentRate,
      equals_naira:    Math.round(nairaValue),
      minus_fee_1_5pct: Math.round(fee),
      net_payout:      Math.round(nairaValue - fee),
    },
  });
});

module.exports = router;
