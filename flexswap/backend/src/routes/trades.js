const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { PLATFORM_FEE, ORDER_STATUS, ESCROW_STATUS } = require("../config/constants");
const { asyncHandler } = require("../middleware/errorHandler");

// ─── POST /api/trades/buy — Buyer initiates a purchase ───────────────────────
router.post("/buy", asyncHandler(async (req, res) => {
  const { listing_id } = req.body;
  if (!listing_id) return res.status(400).json({ error: "listing_id required" });

  const listing = global.store.listings.get(listing_id);
  if (!listing || listing.status !== "active")
    return res.status(404).json({ error: "Listing is not available" });
  if (listing.seller_id === req.user.id)
    return res.status(400).json({ error: "You cannot buy your own listing" });

  const fee = listing.asking_price * PLATFORM_FEE;

  const order = {
    id:              uuidv4(),
    listing_id,
    buyer_id:        req.user.id,
    buyer_username:  req.user.username,
    seller_id:       listing.seller_id,
    seller_username: listing.seller_username,
    card_type_id:    listing.card_type_id,
    card_name:       listing.card_name,
    denomination:    listing.denomination,
    amount_ngn:      listing.asking_price,
    platform_fee:    Math.round(fee),
    seller_receives: Math.round(listing.asking_price - fee),
    status:          ORDER_STATUS.PENDING,
    dispute_reason:  null,
    escrow_locked_at: null,
    completed_at:    null,
    created_at:      new Date(),
    updated_at:      new Date(),
  };

  global.store.orders.set(order.id, order);
  listing.status     = "reserved";
  listing.updated_at = new Date();

  res.status(201).json({
    order,
    next_step:    `POST /api/trades/${order.id}/fund-escrow`,
    instructions: "Fund the escrow to lock your payment. The seller will then share card details.",
  });
}));

// ─── POST /api/trades/:id/fund-escrow — Buyer locks funds ────────────────────
router.post("/:id/fund-escrow", asyncHandler(async (req, res) => {
  const order = global.store.orders.get(req.params.id);
  if (!order)                          return res.status(404).json({ error: "Order not found" });
  if (order.buyer_id !== req.user.id)  return res.status(403).json({ error: "Forbidden" });
  if (order.status !== ORDER_STATUS.PENDING)
    return res.status(400).json({ error: `Order is already in status: ${order.status}` });

  const buyer = global.store.users.get(req.user.id);
  if (!buyer)                          return res.status(404).json({ error: "User not found" });
  if (buyer.wallet_ngn < order.amount_ngn)
    return res.status(400).json({ error: `Insufficient NGN balance. You have ₦${buyer.wallet_ngn.toLocaleString()}, need ₦${order.amount_ngn.toLocaleString()}` });

  // Deduct from wallet, hold in escrow balance
  buyer.wallet_ngn    -= order.amount_ngn;
  buyer.wallet_escrow  = (buyer.wallet_escrow || 0) + order.amount_ngn;

  const escrowRecord = {
    id:         uuidv4(),
    order_id:   order.id,
    amount:     order.amount_ngn,
    status:     ESCROW_STATUS.LOCKED,
    locked_at:  new Date(),
    released_at:    null,
    release_reason: null,
  };
  global.store.escrow.set(order.id, escrowRecord);

  order.status          = ORDER_STATUS.ESCROW;
  order.escrow_locked_at = new Date();
  order.updated_at       = new Date();

  // Broadcast escrow event to seller via WebSocket
  broadcastToUser(order.seller_id, { type: "escrow_funded", order_id: order.id, amount: order.amount_ngn });

  res.json({
    message: "✅ Funds locked in escrow. Seller has been notified to share card details.",
    order,
    escrow:  escrowRecord,
  });
}));

// ─── POST /api/trades/:id/card-details — Seller shares card (after escrow) ───
router.post("/:id/card-details", asyncHandler(async (req, res) => {
  const order = global.store.orders.get(req.params.id);
  if (!order)                            return res.status(404).json({ error: "Not found" });
  if (order.seller_id !== req.user.id)   return res.status(403).json({ error: "Forbidden" });
  if (order.status !== ORDER_STATUS.ESCROW)
    return res.status(400).json({ error: "Order must be in escrow before sharing card details" });

  const { card_code, card_pin } = req.body;
  if (!card_code) return res.status(400).json({ error: "card_code is required" });

  // In production: store encrypted, only share with buyer after escrow confirmed
  order.card_code_shared = card_code;
  order.card_pin_shared  = card_pin || null;
  order.status           = ORDER_STATUS.VALIDATING;
  order.updated_at       = new Date();

  // Notify buyer
  broadcastToUser(order.buyer_id, { type: "card_details_shared", order_id: order.id, card_code, card_pin });

  res.json({ message: "Card details shared with buyer. Awaiting validation." });
}));

// ─── POST /api/trades/:id/validate — Buyer confirms card works ────────────────
router.post("/:id/validate", asyncHandler(async (req, res) => {
  const order = global.store.orders.get(req.params.id);
  if (!order)                          return res.status(404).json({ error: "Not found" });
  if (order.buyer_id !== req.user.id)  return res.status(403).json({ error: "Forbidden" });
  if (![ORDER_STATUS.ESCROW, ORDER_STATUS.VALIDATING].includes(order.status))
    return res.status(400).json({ error: `Order status is ${order.status}, cannot validate` });

  const { valid, reason } = req.body;

  if (valid) {
    // Release escrow to seller
    const seller = global.store.users.get(order.seller_id);
    const buyer  = global.store.users.get(req.user.id);

    if (seller) {
      seller.wallet_ngn   = (seller.wallet_ngn  || 0) + order.seller_receives;
      seller.total_trades = (seller.total_trades || 0) + 1;
      seller.updated_at   = new Date();
    }
    if (buyer) {
      buyer.wallet_escrow  = Math.max(0, (buyer.wallet_escrow || 0) - order.amount_ngn);
      buyer.total_trades   = (buyer.total_trades || 0) + 1;
      buyer.updated_at     = new Date();
    }

    const listing = global.store.listings.get(order.listing_id);
    if (listing) { listing.status = "sold"; listing.updated_at = new Date(); }

    const esc = global.store.escrow.get(order.id);
    if (esc) { esc.status = ESCROW_STATUS.RELEASED; esc.released_at = new Date(); esc.release_reason = "buyer_confirmed"; }

    order.status       = ORDER_STATUS.COMPLETE;
    order.completed_at = new Date();
    order.updated_at   = new Date();

    broadcastToUser(order.seller_id, { type: "trade_complete", order_id: order.id, amount: order.seller_receives });

    return res.json({ message: "🎉 Trade complete! Funds released to seller.", order });
  } else {
    order.status         = ORDER_STATUS.DISPUTED;
    order.dispute_reason = reason || "Buyer reported card issue";
    order.updated_at     = new Date();

    broadcastToUser(order.seller_id, { type: "trade_disputed", order_id: order.id, reason: order.dispute_reason });

    return res.json({
      message: "Dispute opened. FlexSwap team will review within 24 hours. Escrow remains locked.",
      order,
    });
  }
}));

// ─── GET /api/trades/my — User's order history ───────────────────────────────
router.get("/my", (req, res) => {
  const { status, role } = req.query;

  let orders = [...global.store.orders.values()].filter(o =>
    role === "buyer"  ? o.buyer_id  === req.user.id :
    role === "seller" ? o.seller_id === req.user.id :
    o.buyer_id === req.user.id || o.seller_id === req.user.id
  );

  if (status) orders = orders.filter(o => o.status === status);

  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({ orders, total: orders.length });
});

// ─── GET /api/trades/:id — Order + escrow detail ─────────────────────────────
router.get("/:id", (req, res) => {
  const order = global.store.orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id)
    return res.status(403).json({ error: "Forbidden" });

  res.json({ order, escrow: global.store.escrow.get(order.id) || null });
});

// ─── Helper: broadcast a WS message to a specific user ───────────────────────
function broadcastToUser(userId, payload) {
  global.wss?.clients.forEach(client => {
    if (client.userId === userId && client.readyState === 1)
      client.send(JSON.stringify(payload));
  });
}

module.exports = router;
