const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { asyncHandler } = require("../middleware/errorHandler");

// ─── POST /api/chat/conversations — Start or retrieve a conversation ──────────
router.post("/conversations", asyncHandler(async (req, res) => {
  const { with_user_id, order_id } = req.body;
  if (!with_user_id && !order_id)
    return res.status(400).json({ error: "with_user_id or order_id required" });

  // Prevent self-conversation
  if (with_user_id === req.user.id)
    return res.status(400).json({ error: "Cannot start a conversation with yourself" });

  // Return existing conversation if found
  const existing = [...global.store.conversations.values()].find(c =>
    order_id
      ? c.order_id === order_id
      : c.participants.includes(req.user.id) && c.participants.includes(with_user_id)
  );
  if (existing) return res.json(existing);

  const conv = {
    id:            uuidv4(),
    order_id:      order_id     || null,
    participants:  with_user_id ? [req.user.id, with_user_id] : [req.user.id],
    last_message:  null,
    unread_counts: { [req.user.id]: 0 },
    created_at:    new Date(),
    updated_at:    new Date(),
  };
  global.store.conversations.set(conv.id, conv);
  res.status(201).json(conv);
}));

// ─── GET /api/chat/conversations — List user's conversations ─────────────────
router.get("/conversations", (req, res) => {
  const mine = [...global.store.conversations.values()]
    .filter(c => c.participants.includes(req.user.id))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  res.json({ conversations: mine, total: mine.length });
});

// ─── GET /api/chat/conversations/:id ─────────────────────────────────────────
router.get("/conversations/:id", (req, res) => {
  const conv = global.store.conversations.get(req.params.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  if (!conv.participants.includes(req.user.id)) return res.status(403).json({ error: "Forbidden" });
  res.json(conv);
});

// ─── GET /api/chat/conversations/:id/messages ────────────────────────────────
router.get("/conversations/:id/messages", (req, res) => {
  const conv = global.store.conversations.get(req.params.id);
  if (!conv) return res.status(404).json({ error: "Not found" });
  if (!conv.participants.includes(req.user.id)) return res.status(403).json({ error: "Forbidden" });

  const { page = 1, limit = 50 } = req.query;
  const allMsgs = [...(global.store.messages.get(req.params.id) || [])];
  allMsgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const pg    = parseInt(page);
  const lm    = parseInt(limit);
  const start = (pg - 1) * lm;
  const paged = allMsgs.slice(start, start + lm);

  // Reset unread count for this user
  if (conv.unread_counts) conv.unread_counts[req.user.id] = 0;

  res.json({ messages: paged, total: allMsgs.length, page: pg, conversation: conv });
});

// ─── POST /api/chat/conversations/:id/messages — Send a message ──────────────
router.post("/conversations/:id/messages", asyncHandler(async (req, res) => {
  const conv = global.store.conversations.get(req.params.id);
  if (!conv) return res.status(404).json({ error: "Not found" });
  if (!conv.participants.includes(req.user.id)) return res.status(403).json({ error: "Forbidden" });

  const { content, message_type = "text", metadata } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Message content cannot be empty" });
  if (content.length > 2000) return res.status(400).json({ error: "Message exceeds 2000 character limit" });

  const msg = {
    id:               uuidv4(),
    conversation_id:  req.params.id,
    sender_id:        req.user.id,
    sender_username:  req.user.username,
    content:          content.trim(),
    message_type,   // text | offer | system | image
    metadata:         metadata || null,
    read_by:          [req.user.id],
    read_at:          null,
    created_at:       new Date(),
  };

  if (!global.store.messages.has(req.params.id))
    global.store.messages.set(req.params.id, []);
  global.store.messages.get(req.params.id).push(msg);

  conv.last_message = msg;
  conv.updated_at   = new Date();

  // Increment unread for other participants
  conv.participants.forEach(uid => {
    if (uid !== req.user.id) {
      conv.unread_counts = conv.unread_counts || {};
      conv.unread_counts[uid] = (conv.unread_counts[uid] || 0) + 1;
    }
  });

  // Real-time push via WebSocket
  global.wss?.clients.forEach(client => {
    if (client.userId && conv.participants.includes(client.userId) && client.readyState === 1)
      client.send(JSON.stringify({ type: "new_message", message: msg, conversation_id: req.params.id }));
  });

  res.status(201).json(msg);
}));

// ─── PUT /api/chat/conversations/:id/messages/:msgId/read ─────────────────────
router.put("/conversations/:id/messages/:msgId/read", (req, res) => {
  const msgs = global.store.messages.get(req.params.id) || [];
  const msg  = msgs.find(m => m.id === req.params.msgId);
  if (!msg) return res.status(404).json({ error: "Message not found" });
  if (!msg.read_by.includes(req.user.id)) {
    msg.read_by.push(req.user.id);
    msg.read_at = new Date();
  }
  res.json({ read: true });
});

module.exports = router;
