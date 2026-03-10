import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { ws }  from "../services/websocket";

// ── useCards: fetch + live-update card list ───────────────────────────────────
export const useCards = (params = {}) => {
  const [cards,   setCards]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const { cards } = await api.cards.list(params);
      setCards(cards);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  // Live rate updates from WS
  useEffect(() => {
    const off = ws.on("market_tick", ({ rates }) => {
      setCards(prev => prev.map(c => rates[c.id] ? { ...c, rate: rates[c.id] } : c));
    });
    return off;
  }, []);

  return { cards, loading, error, refetch: fetch };
};

// ── useListings: paginated listing browser ────────────────────────────────────
export const useListings = (params = {}) => {
  const [listings, setListings] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listings.list(params);
      setListings(data.listings);
      setTotal(data.total);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { listings, total, loading, error, refetch: fetch };
};

// ── useWallet: wallet balance + auto-refresh ──────────────────────────────────
export const useWallet = () => {
  const [wallet,  setWallet]  = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const w = await api.wallet.balance();
      setWallet(w);
      return w;
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, []);

  // Refresh when a trade completes
  useEffect(() => {
    const off = ws.on("trade_complete", refresh);
    return off;
  }, [refresh]);

  return { wallet, loading, refresh };
};

// ── useConversation: real-time chat ──────────────────────────────────────────
export const useConversation = (conversationId) => {
  const [messages,  setMessages]  = useState([]);
  const [typing,    setTyping]    = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!conversationId) return;
    ws.joinConversation(conversationId);

    api.chat.messages(conversationId).then(({ messages }) => {
      setMessages(messages);
      setLoading(false);
    });

    const offMsg = ws.on("new_message", (data) => {
      if (data.conversation_id === conversationId)
        setMessages(prev => [...prev, data.message]);
    });

    const offTyping = ws.on("typing", (data) => {
      if (data.conversation_id === conversationId) {
        setTyping(true);
        setTimeout(() => setTyping(false), 2000);
      }
    });

    return () => { ws.leaveConversation(conversationId); offMsg(); offTyping(); };
  }, [conversationId]);

  const sendMessage = useCallback(async (content, message_type = "text") => {
    const msg = await api.chat.send(conversationId, { content, message_type });
    // Optimistic update already done via WS broadcast
    return msg;
  }, [conversationId]);

  const sendTyping = useCallback(() => ws.sendTyping(conversationId), [conversationId]);

  return { messages, typing, loading, sendMessage, sendTyping };
};

// ── useTrade: live trade status ───────────────────────────────────────────────
export const useTrade = (orderId) => {
  const [order,   setOrder]   = useState(null);
  const [escrow,  setEscrow]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    api.trades.get(orderId).then(({ order, escrow }) => {
      setOrder(order); setEscrow(escrow); setLoading(false);
    });

    const offComplete = ws.on("trade_complete",  () => api.trades.get(orderId).then(({ order }) => setOrder(order)));
    const offDisputed = ws.on("trade_disputed",  () => api.trades.get(orderId).then(({ order }) => setOrder(order)));
    const offEscrow   = ws.on("escrow_funded",   () => api.trades.get(orderId).then(({ order, escrow }) => { setOrder(order); setEscrow(escrow); }));

    return () => { offComplete(); offDisputed(); offEscrow(); };
  }, [orderId]);

  return { order, escrow, loading };
};
