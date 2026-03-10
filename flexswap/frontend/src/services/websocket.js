const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5000/ws";

class FlexSwapWS {
  constructor() {
    this.ws          = null;
    this.listeners   = new Map();
    this.reconnectMs = 3000;
    this.reconnectTimer = null;
    this.token       = null;
  }

  connect(token) {
    this.token = token;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log("[WS] Connected");
      clearTimeout(this.reconnectTimer);
      if (this.token) this.send({ type: "auth", token: this.token });
      this.emit("connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
        this.emit("*", data); // wildcard listener
      } catch (e) {
        console.warn("[WS] Bad message", e);
      }
    };

    this.ws.onclose = () => {
      console.log("[WS] Disconnected — reconnecting in", this.reconnectMs, "ms");
      this.emit("disconnected");
      this.reconnectTimer = setTimeout(() => this.connect(this.token), this.reconnectMs);
    };

    this.ws.onerror = (err) => {
      console.error("[WS] Error", err);
      this.emit("error", err);
    };
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    this.token = null;
    if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; }
  }

  send(payload) {
    if (this.ws?.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify(payload));
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  // Convenience helpers
  joinConversation(id)   { this.send({ type: "join_conversation",  conversation_id: id }); }
  leaveConversation(id)  { this.send({ type: "leave_conversation", conversation_id: id }); }
  sendTyping(id)         { this.send({ type: "typing",             conversation_id: id }); }
  stopTyping(id)         { this.send({ type: "stop_typing",        conversation_id: id }); }
  subscribeOrderbook(id) { this.send({ type: "subscribe_orderbook", card_type_id: id }); }
}

export const ws = new FlexSwapWS();
