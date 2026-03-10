// ── Number formatting ─────────────────────────────────────────────────────────
export const formatNaira = (n) =>
  `₦${Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

export const formatUSD = (n) =>
  `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export const formatRate = (r) => `${((r || 0) * 100).toFixed(0)}%`;

export const formatVolume = (n) => {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}K`;
  return formatNaira(n);
};

// ── Date helpers ─────────────────────────────────────────────────────────────
export const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ── Trade status helpers ──────────────────────────────────────────────────────
export const STATUS_COLORS = {
  pending:    "#F5C842",
  escrow:     "#3B82F6",
  validating: "#B45EFF",
  complete:   "#00E5A0",
  disputed:   "#FF4D6A",
  cancelled:  "#7A8299",
};

export const STATUS_LABELS = {
  pending:    "Awaiting Payment",
  escrow:     "Funds Locked",
  validating: "Validating Card",
  complete:   "Complete",
  disputed:   "Disputed",
  cancelled:  "Cancelled",
};

// ── Truncate text ─────────────────────────────────────────────────────────────
export const truncate = (str, len = 40) =>
  str?.length > len ? str.slice(0, len) + "…" : str;

// ── Badge colors ──────────────────────────────────────────────────────────────
export const BADGE_COLORS = {
  "New Trader":   { bg: "#3B82F622", color: "#3B82F6" },
  "Verified":     { bg: "#00E5A022", color: "#00E5A0" },
  "Top Trader":   { bg: "#F5C84222", color: "#F5C842" },
  "Power Trader": { bg: "#B45EFF22", color: "#B45EFF" },
  "Rising":       { bg: "#FF9F4322", color: "#FF9F43" },
};
