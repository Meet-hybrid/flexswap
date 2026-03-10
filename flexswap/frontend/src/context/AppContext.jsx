import { createContext, useContext, useState, useEffect } from "react";
import { ws }  from "../services/websocket";
import { api } from "../services/api";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [liveRates,  setLiveRates]  = useState({});
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [wallet,     setWallet]     = useState(null);
  const [notification, setNotification] = useState(null);

  // Subscribe to live WS rate ticks
  useEffect(() => {
    const off = ws.on("market_tick", ({ rates }) => {
      setLiveRates(prev => ({ ...prev, ...rates }));
    });
    return off;
  }, []);

  // Global notification toasts from WS events
  useEffect(() => {
    const offComplete = ws.on("trade_complete",  ({ order_id, amount }) => {
      showNotification(`Trade complete! ₦${amount?.toLocaleString()} released.`, "success");
    });
    const offDisputed = ws.on("trade_disputed",  () => {
      showNotification("Dispute opened — our team will review within 24h.", "warning");
    });
    const offEscrow   = ws.on("escrow_funded",   () => {
      showNotification("Escrow funded — share your card details now.", "info");
    });
    const offMsg      = ws.on("new_message",     () => {
      setUnreadMsgs(n => n + 1);
    });
    return () => { offComplete(); offDisputed(); offEscrow(); offMsg(); };
  }, []);

  const showNotification = (message, type = "info") => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 4000);
  };

  const refreshWallet = async () => {
    try { const w = await api.wallet.balance(); setWallet(w); return w; }
    catch {}
  };

  return (
    <AppContext.Provider value={{ liveRates, unreadMsgs, setUnreadMsgs, wallet, refreshWallet, notification, showNotification }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
};
