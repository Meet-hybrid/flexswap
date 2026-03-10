-- ============================================================
-- FlexSwap — PostgreSQL Production Schema
-- Run: psql -U postgres -d flexswap -f db/schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  username        VARCHAR(50)   UNIQUE NOT NULL,
  email           VARCHAR(255)  UNIQUE NOT NULL,
  password_hash   TEXT          NOT NULL,
  phone           VARCHAR(20),
  rep_score       DECIMAL(3,2)  DEFAULT 5.00 CHECK (rep_score BETWEEN 0 AND 5),
  total_trades    INTEGER       DEFAULT 0,
  is_verified     BOOLEAN       DEFAULT false,
  badge           VARCHAR(50)   DEFAULT 'New Trader',
  bank_name       VARCHAR(100),
  bank_account    VARCHAR(20),
  wallet_ngn      DECIMAL(15,2) DEFAULT 0.00 CHECK (wallet_ngn  >= 0),
  wallet_usdt     DECIMAL(15,6) DEFAULT 0.00 CHECK (wallet_usdt >= 0),
  wallet_btc      DECIMAL(15,8) DEFAULT 0.00 CHECK (wallet_btc  >= 0),
  wallet_escrow   DECIMAL(15,2) DEFAULT 0.00 CHECK (wallet_escrow >= 0),
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── CARD TYPES ──────────────────────────────────────────────────────────────
CREATE TABLE card_types (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(100)  NOT NULL,
  category        VARCHAR(50)   NOT NULL,
  icon            VARCHAR(10),
  color           VARCHAR(10),
  current_rate    DECIMAL(5,4)  NOT NULL CHECK (current_rate BETWEEN 0 AND 1),
  rate_24h_change DECIMAL(5,2)  DEFAULT 0,
  volume_24h      DECIMAL(15,2) DEFAULT 0,
  is_active       BOOLEAN       DEFAULT true,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── LISTINGS ────────────────────────────────────────────────────────────────
CREATE TABLE listings (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_type_id    UUID          NOT NULL REFERENCES card_types(id),
  denomination    DECIMAL(10,2) NOT NULL CHECK (denomination > 0),
  currency        VARCHAR(10)   DEFAULT 'USD',
  asking_price    DECIMAL(15,2) NOT NULL CHECK (asking_price > 0),
  rate            DECIMAL(5,4)  NOT NULL CHECK (rate BETWEEN 0 AND 1),
  -- Card details stored encrypted (use pgcrypto or external vault in production)
  card_code       TEXT,
  card_pin        TEXT,
  sell_type       VARCHAR(20)   DEFAULT 'instant' CHECK (sell_type IN ('instant','auction','p2p')),
  status          VARCHAR(20)   DEFAULT 'active'  CHECK (status IN ('active','reserved','sold','cancelled','expired')),
  views           INTEGER       DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── ORDERS ──────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id       UUID          REFERENCES listings(id),
  buyer_id         UUID          NOT NULL REFERENCES users(id),
  seller_id        UUID          NOT NULL REFERENCES users(id),
  amount_ngn       DECIMAL(15,2) NOT NULL,
  platform_fee     DECIMAL(15,2) NOT NULL,
  seller_receives  DECIMAL(15,2) NOT NULL,
  status           VARCHAR(30)   DEFAULT 'pending' CHECK (status IN ('pending','escrow','validating','complete','disputed','cancelled')),
  dispute_reason   TEXT,
  escrow_locked_at TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── ESCROW ──────────────────────────────────────────────────────────────────
CREATE TABLE escrow (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID          UNIQUE REFERENCES orders(id),
  amount          DECIMAL(15,2) NOT NULL,
  status          VARCHAR(20)   DEFAULT 'locked' CHECK (status IN ('locked','released','refunded')),
  locked_at       TIMESTAMPTZ   DEFAULT NOW(),
  released_at     TIMESTAMPTZ,
  release_reason  TEXT
);

-- ─── BIDS ────────────────────────────────────────────────────────────────────
CREATE TABLE bids (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id      UUID          NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  bidder_id       UUID          NOT NULL REFERENCES users(id),
  bid_amount      DECIMAL(15,2) NOT NULL CHECK (bid_amount > 0),
  status          VARCHAR(20)   DEFAULT 'active' CHECK (status IN ('active','accepted','outbid','expired')),
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── CONVERSATIONS ───────────────────────────────────────────────────────────
CREATE TABLE conversations (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID          REFERENCES orders(id),
  participant_a   UUID          NOT NULL REFERENCES users(id),
  participant_b   UUID          NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── MESSAGES ────────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID          NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID          NOT NULL REFERENCES users(id),
  content         TEXT          NOT NULL,
  message_type    VARCHAR(20)   DEFAULT 'text' CHECK (message_type IN ('text','offer','system','image')),
  metadata        JSONB,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── REVIEWS ─────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID          NOT NULL REFERENCES orders(id),
  reviewer_id     UUID          NOT NULL REFERENCES users(id),
  reviewed_id     UUID          NOT NULL REFERENCES users(id),
  rating          INTEGER       NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (order_id, reviewer_id)
);

-- ─── RATE HISTORY (for analytics & AI pricing) ───────────────────────────────
CREATE TABLE rate_history (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_type_id    UUID          NOT NULL REFERENCES card_types(id),
  rate            DECIMAL(5,4)  NOT NULL,
  volume          DECIMAL(15,2) DEFAULT 0,
  recorded_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── WALLET TRANSACTIONS ──────────────────────────────────────────────────────
CREATE TABLE wallet_transactions (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID          NOT NULL REFERENCES users(id),
  type            VARCHAR(20)   NOT NULL CHECK (type IN ('deposit','withdrawal','escrow_lock','escrow_release','trade_credit','conversion')),
  currency        VARCHAR(10)   NOT NULL,
  amount          DECIMAL(15,8) NOT NULL,
  balance_after   DECIMAL(15,8) NOT NULL,
  reference       VARCHAR(100),
  description     TEXT,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_listings_card_type  ON listings(card_type_id);
CREATE INDEX idx_listings_seller     ON listings(seller_id);
CREATE INDEX idx_listings_status     ON listings(status);
CREATE INDEX idx_listings_sell_type  ON listings(sell_type);
CREATE INDEX idx_listings_expires    ON listings(expires_at);

CREATE INDEX idx_orders_buyer        ON orders(buyer_id);
CREATE INDEX idx_orders_seller       ON orders(seller_id);
CREATE INDEX idx_orders_status       ON orders(status);
CREATE INDEX idx_orders_listing      ON orders(listing_id);

CREATE INDEX idx_messages_conv       ON messages(conversation_id, created_at);
CREATE INDEX idx_rate_history_card   ON rate_history(card_type_id, recorded_at);
CREATE INDEX idx_wallet_tx_user      ON wallet_transactions(user_id, created_at);
CREATE INDEX idx_bids_listing        ON bids(listing_id);

-- ─── AUTO update_at trigger ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at    BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON listings      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at   BEFORE UPDATE ON orders        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER convs_updated_at    BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── SEED: Card Types ────────────────────────────────────────────────────────
INSERT INTO card_types (name, category, icon, color, current_rate, rate_24h_change, volume_24h) VALUES
  ('Amazon',         'Shopping',      '🛒', '#FF9900', 0.87, 2.3,  4200000),
  ('iTunes / Apple', 'Entertainment', '🎵', '#FC3C44', 0.82, -0.8, 2800000),
  ('Steam',          'Gaming',        '🎮', '#1B2838', 0.79, 1.1,  1900000),
  ('Google Play',    'Apps',          '▶',  '#34A853', 0.81, 0.5,  1500000),
  ('Walmart',        'Shopping',      '🛍', '#0071CE', 0.83, 3.1,  980000),
  ('Netflix',        'Entertainment', '🎬', '#E50914', 0.76, -1.2, 760000),
  ('Visa Prepaid',   'Prepaid',       '💳', '#1A1F71', 0.91, 4.2,  5100000),
  ('eBay',           'Shopping',      '📦', '#E53238', 0.80, 0.9,  640000);
