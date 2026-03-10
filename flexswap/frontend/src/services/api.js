const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const getToken = () => localStorage.getItem("flexswap_token");

const headers = (extra = {}) => ({
  "Content-Type": "application/json",
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

const request = async (method, path, body) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

// ── Auth ─────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (body) => request("POST", "/auth/register", body),
    login:    (body) => request("POST", "/auth/login", body),
    me:       ()     => request("GET",  "/auth/me"),
    update:   (body) => request("PUT",  "/auth/profile", body),
  },

  // ── Cards ────────────────────────────────────────────────────
  cards: {
    list:      (params = {}) => request("GET", `/cards?${new URLSearchParams(params)}`),
    get:       (id)           => request("GET", `/cards/${id}`),
    price:     (id, amount)   => request("GET", `/cards/${id}/price?amount=${amount}`),
  },

  // ── Listings ─────────────────────────────────────────────────
  listings: {
    create:   (body)   => request("POST", "/listings", body),
    list:     (params) => request("GET",  `/listings?${new URLSearchParams(params)}`),
    mine:     ()       => request("GET",  "/listings/mine"),
    get:      (id)     => request("GET",  `/listings/${id}`),
    update:   (id, b)  => request("PUT",  `/listings/${id}`, b),
    cancel:   (id)     => request("PUT",  `/listings/${id}/cancel`),
    bid:      (id, b)  => request("POST", `/listings/${id}/bid`, b),
  },

  // ── Trades ───────────────────────────────────────────────────
  trades: {
    buy:          (body) => request("POST", "/trades/buy", body),
    fundEscrow:   (id)   => request("POST", `/trades/${id}/fund-escrow`),
    shareCard:    (id,b) => request("POST", `/trades/${id}/card-details`, b),
    validate:     (id,b) => request("POST", `/trades/${id}/validate`, b),
    mine:         (p={}) => request("GET",  `/trades/my?${new URLSearchParams(p)}`),
    get:          (id)   => request("GET",  `/trades/${id}`),
  },

  // ── Wallet ───────────────────────────────────────────────────
  wallet: {
    balance:   ()    => request("GET",  "/wallet/balance"),
    deposit:   (b)   => request("POST", "/wallet/deposit",  b),
    withdraw:  (b)   => request("POST", "/wallet/withdraw", b),
    convert:   (b)   => request("POST", "/wallet/convert",  b),
    txHistory: ()    => request("GET",  "/wallet/transactions"),
  },

  // ── Chat ─────────────────────────────────────────────────────
  chat: {
    startConversation: (b)    => request("POST", "/chat/conversations", b),
    conversations:     ()     => request("GET",  "/chat/conversations"),
    messages:          (id,p) => request("GET",  `/chat/conversations/${id}/messages?${new URLSearchParams(p)}`),
    send:              (id,b) => request("POST",  `/chat/conversations/${id}/messages`, b),
    markRead:          (cid, mid) => request("PUT", `/chat/conversations/${cid}/messages/${mid}/read`),
  },
};
