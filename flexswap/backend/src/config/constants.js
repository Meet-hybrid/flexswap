module.exports = {
  JWT_SECRET:       process.env.JWT_SECRET || "flexswap_dev_secret",
  JWT_EXPIRY:       "7d",
  PLATFORM_FEE:     0.015,          // 1.5% per trade
  USD_TO_NGN:       1650,           // update via FX API in production
  ESCROW_TIMEOUT:   24 * 60 * 60 * 1000, // 24 hours in ms

  // Wallet currency keys
  CURRENCIES:       ["NGN", "USDT", "BTC"],

  // FX conversion rates (update via live API in production)
  FX_RATES: {
    NGN_USDT:  1 / 1596,
    USDT_NGN:  1596,
    NGN_BTC:   1 / 134000000,
    BTC_NGN:   134000000,
    USDT_BTC:  1 / 65000,
    BTC_USDT:  65000,
  },

  // Sell types
  SELL_TYPES: ["instant", "auction", "p2p"],

  // Order statuses
  ORDER_STATUS: {
    PENDING:    "pending",
    ESCROW:     "escrow",
    VALIDATING: "validating",
    COMPLETE:   "complete",
    DISPUTED:   "disputed",
    CANCELLED:  "cancelled",
  },

  // Escrow statuses
  ESCROW_STATUS: {
    LOCKED:    "locked",
    RELEASED:  "released",
    REFUNDED:  "refunded",
  },
};
