const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { SELL_TYPES }  = require("../config/constants");
const { asyncHandler } = require("../middleware/errorHandler");

// ─── POST /api/listings ───────────────────────────────────────────────────────
router.post("/", asyncHandler(async (req, res) => {
  const {
    card_type_id,
    denomination,
    currency = "USD",
    asking_price,
    rate,
    sell_type = "instant",
    card_code,
    card_pin,
    expires_in_hours = 24,
  } = req.body;

  if (!card_type_id || !denomination || !asking_price)
    return res.status(400).json({ error: "card_type_id, denomination, and asking_price are required" });

  if (!global.store.cardTypes.has(card_type_id))
    return res.status(400).json({ error: "Invalid card_type_id" });

  if (!SELL_TYPES.includes(sell_type))
    return res.status(400).json({ error: `sell_type must be one of: ${SELL_TYPES.join(", ")}` });

  if (parseFloat(denomination) <= 0 || parseFloat(asking_price) <= 0)
    return res.status(400).json({ error: "denomination and asking_price must be positive numbers" });

  const card = global.store.cardTypes.get(card_type_id);

  const listing = {
    id:               uuidv4(),
    seller_id:        req.user.id,
    seller_username:  req.user.username,
    card_type_id,
    card_name:        card.name,
    card_icon:        card.icon,
    denomination:     parseFloat(denomination),
    currency,
    asking_price:     parseFloat(asking_price),
    rate:             parseFloat(rate) || card.baseRate,
    sell_type,
    card_code:        card_code || null,   // encrypt in production (use crypto or vault)
    card_pin:         card_pin  || null,
    status:           "active",            // active | reserved | sold | cancelled | expired
    bids:             [],
    views:            0,
    expires_at:       new Date(Date.now() + Math.min(expires_in_hours, 72) * 3600000),
    created_at:       new Date(),
    updated_at:       new Date(),
  };

  global.store.listings.set(listing.id, listing);

  // Don't expose card codes in response until trade is locked
  const { card_code: _, card_pin: __, ...safeListing } = listing;
  res.status(201).json(safeListing);
}));

// ─── GET /api/listings ───────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const { card_type_id, sell_type, min_price, max_price, page = 1, limit = 20, sort = "newest" } = req.query;

  let results = [...global.store.listings.values()].filter(l => {
    if (l.status !== "active") return false;
    if (l.expires_at < new Date()) { l.status = "expired"; return false; }
    return true;
  });

  if (card_type_id) results = results.filter(l => l.card_type_id === card_type_id);
  if (sell_type)    results = results.filter(l => l.sell_type    === sell_type);
  if (min_price)    results = results.filter(l => l.asking_price >= parseFloat(min_price));
  if (max_price)    results = results.filter(l => l.asking_price <= parseFloat(max_price));

  if (sort === "newest")    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sort === "price_asc") results.sort((a, b) => a.asking_price - b.asking_price);
  if (sort === "price_desc") results.sort((a, b) => b.asking_price - a.asking_price);
  if (sort === "rate")      results.sort((a, b) => b.rate - a.rate);

  const pg     = Math.max(1, parseInt(page));
  const lm     = Math.min(50, Math.max(1, parseInt(limit)));
  const start  = (pg - 1) * lm;
  const paged  = results.slice(start, start + lm).map(({ card_code, card_pin, ...l }) => l);

  res.json({ listings: paged, total: results.length, page: pg, pages: Math.ceil(results.length / lm) });
});

// ─── GET /api/listings/mine ───────────────────────────────────────────────────
router.get("/mine", (req, res) => {
  const mine = [...global.store.listings.values()]
    .filter(l => l.seller_id === req.user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ listings: mine.map(({ card_code, card_pin, ...l }) => l), total: mine.length });
});

// ─── GET /api/listings/:id ────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const listing = global.store.listings.get(req.params.id);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  listing.views++;
  const { card_code, card_pin, ...safe } = listing;
  res.json(safe);
});

// ─── PUT /api/listings/:id ────────────────────────────────────────────────────
router.put("/:id", asyncHandler(async (req, res) => {
  const listing = global.store.listings.get(req.params.id);
  if (!listing) return res.status(404).json({ error: "Not found" });
  if (listing.seller_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  if (listing.status !== "active") return res.status(400).json({ error: "Only active listings can be edited" });

  const { asking_price, rate, expires_in_hours } = req.body;
  if (asking_price) listing.asking_price = parseFloat(asking_price);
  if (rate)         listing.rate         = parseFloat(rate);
  if (expires_in_hours) listing.expires_at = new Date(Date.now() + expires_in_hours * 3600000);
  listing.updated_at = new Date();

  const { card_code, card_pin, ...safe } = listing;
  res.json(safe);
}));

// ─── PUT /api/listings/:id/cancel ────────────────────────────────────────────
router.put("/:id/cancel", (req, res) => {
  const listing = global.store.listings.get(req.params.id);
  if (!listing) return res.status(404).json({ error: "Not found" });
  if (listing.seller_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  if (!["active"].includes(listing.status)) return res.status(400).json({ error: `Cannot cancel a ${listing.status} listing` });
  listing.status = "cancelled";
  listing.updated_at = new Date();
  res.json({ message: "Listing cancelled successfully" });
});

// ─── POST /api/listings/:id/bid — Auction bids ───────────────────────────────
router.post("/:id/bid", asyncHandler(async (req, res) => {
  const listing = global.store.listings.get(req.params.id);
  if (!listing || listing.status !== "active") return res.status(404).json({ error: "Listing not available" });
  if (listing.sell_type !== "auction")          return res.status(400).json({ error: "This listing is not an auction" });
  if (listing.seller_id === req.user.id)        return res.status(400).json({ error: "You cannot bid on your own listing" });
  if (listing.expires_at < new Date())          return res.status(400).json({ error: "Auction has expired" });

  const { bid_amount } = req.body;
  if (!bid_amount) return res.status(400).json({ error: "bid_amount is required" });

  const topBid = listing.bids.length
    ? Math.max(...listing.bids.map(b => b.bid_amount))
    : listing.asking_price * 0.8;

  if (parseFloat(bid_amount) <= topBid)
    return res.status(400).json({ error: `Bid must exceed current top bid of ₦${topBid.toLocaleString()}` });

  // Mark previous bids as outbid
  listing.bids.forEach(b => { if (b.status === "active") b.status = "outbid"; });

  const bid = {
    id:               uuidv4(),
    listing_id:       listing.id,
    bidder_id:        req.user.id,
    bidder_username:  req.user.username,
    bid_amount:       parseFloat(bid_amount),
    status:           "active",
    created_at:       new Date(),
  };
  listing.bids.push(bid);

  res.status(201).json({ bid, top_bid: bid.bid_amount, total_bids: listing.bids.length });
}));

module.exports = router;
