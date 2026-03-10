const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/constants");

/**
 * FlexSwap WebSocket Service
 *
 * Events client can SEND:
 *   { type: "auth",                token: "<JWT>" }
 *   { type: "subscribe_orderbook", card_type_id: "1" }
 *   { type: "join_conversation",   conversation_id: "uuid" }
 *   { type: "leave_conversation",  conversation_id: "uuid" }
 *   { type: "typing",              conversation_id: "uuid" }
 *   { type: "stop_typing",         conversation_id: "uuid" }
 *   { type: "ping" }
 *
 * Events client will RECEIVE:
 *   { type: "connected" }
 *   { type: "auth_success",        userId, username }
 *   { type: "auth_error" }
 *   { type: "market_tick",         rates: { "1": 0.871, ... }, timestamp }
 *   { type: "new_message",         message: {...}, conversation_id }
 *   { type: "typing",              from_user, conversation_id }
 *   { type: "stop_typing",         from_user, conversation_id }
 *   { type: "escrow_funded",       order_id, amount }
 *   { type: "card_details_shared", order_id, card_code, card_pin }
 *   { type: "trade_complete",      order_id, amount }
 *   { type: "trade_disputed",      order_id, reason }
 *   { type: "pong" }
 *   { type: "error",               message }
 */
const wsHandler = (wss) => {

  wss.on("connection", (ws, req) => {
    ws.isAlive       = true;
    ws.userId        = null;
    ws.username      = null;
    ws.subscribedCard    = null;
    ws.conversationId    = null;

    ws.on("pong", () => { ws.isAlive = true; });

    ws.send(JSON.stringify({
      type:    "connected",
      message: "FlexSwap WebSocket ready. Send { type: 'auth', token: '<JWT>' } to authenticate.",
    }));

    ws.on("message", (rawData) => {
      let data;
      try { data = JSON.parse(rawData); }
      catch { return ws.send(JSON.stringify({ type: "error", message: "Invalid JSON payload" })); }

      switch (data.type) {

        // ── Auth ──────────────────────────────────────────────
        case "auth": {
          try {
            const user  = jwt.verify(data.token, JWT_SECRET);
            ws.userId   = user.id;
            ws.username = user.username;
            console.log(`[WS] Authenticated: ${user.username} (${user.id})`);
            ws.send(JSON.stringify({ type: "auth_success", userId: user.id, username: user.username }));
          } catch (e) {
            ws.send(JSON.stringify({ type: "auth_error", message: "Invalid or expired token" }));
          }
          break;
        }

        // ── Subscribe to live order book for a card ───────────
        case "subscribe_orderbook": {
          ws.subscribedCard = data.card_type_id || null;
          ws.send(JSON.stringify({ type: "subscribed_orderbook", card_type_id: ws.subscribedCard }));
          break;
        }

        // ── Join / leave a conversation room ──────────────────
        case "join_conversation": {
          ws.conversationId = data.conversation_id;
          ws.send(JSON.stringify({ type: "joined_conversation", conversation_id: ws.conversationId }));
          break;
        }
        case "leave_conversation": {
          ws.conversationId = null;
          ws.send(JSON.stringify({ type: "left_conversation" }));
          break;
        }

        // ── Typing indicators ────────────────────────────────
        case "typing":
        case "stop_typing": {
          const convId = data.conversation_id || ws.conversationId;
          if (!convId || !ws.userId) break;
          wss.clients.forEach(client => {
            if (client !== ws && client.conversationId === convId && client.readyState === 1)
              client.send(JSON.stringify({ type: data.type, from_user: ws.userId, from_username: ws.username, conversation_id: convId }));
          });
          break;
        }

        // ── Ping / pong ──────────────────────────────────────
        case "ping": {
          ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
          break;
        }

        default:
          ws.send(JSON.stringify({ type: "error", message: `Unknown event type: ${data.type}` }));
      }
    });

    ws.on("error", (err) => console.error("[WS Error]", err.message));
    ws.on("close", ()    => console.log(`[WS] Disconnected: ${ws.username || "anonymous"}`));
  });

  // ── Heartbeat: terminate dead connections every 30s ─────────────────────────
  const heartbeat = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) { console.log("[WS] Terminating dead connection"); return ws.terminate(); }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  // ── Market tick: broadcast live rate updates every 8s ───────────────────────
  const marketTick = setInterval(() => {
    if (wss.clients.size === 0) return;

    const cardTypes = global.store?.cardTypes;
    if (!cardTypes) return;

    const rates = {};
    cardTypes.forEach((card, id) => {
      rates[id] = parseFloat((card.baseRate + (Math.random() - 0.5) * 0.006).toFixed(4));
    });

    const tick = JSON.stringify({ type: "market_tick", rates, timestamp: new Date().toISOString() });
    wss.clients.forEach(client => { if (client.readyState === 1) client.send(tick); });
  }, 8_000);

  wss.on("close", () => {
    clearInterval(heartbeat);
    clearInterval(marketTick);
  });

  console.log("[WS] WebSocket service initialized");
};

module.exports = { wsHandler };
