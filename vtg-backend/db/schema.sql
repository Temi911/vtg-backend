-- ============================================================
-- VTG Africa (Vintage Trade Global) — Database Schema
-- PostgreSQL 14+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ── ENUMS ──────────────────────────────────────────────────
CREATE TYPE user_role       AS ENUM ('buyer','supplier','bank','admin');
CREATE TYPE buyer_type      AS ENUM ('individual','business','dealer','ngo');
CREATE TYPE order_status    AS ENUM ('pending','confirmed','lc_issued','shipped','in_transit','arrived','customs','delivered','cancelled','disputed');
CREATE TYPE lc_status       AS ENUM ('requested','issued','shipped','docs_presented','docs_verified','paid','rejected','expired');
CREATE TYPE payment_method  AS ENUM ('lc','tt','escrow','crypto','forex','dp');
CREATE TYPE payment_status  AS ENUM ('pending','processing','completed','failed','refunded');
CREATE TYPE doc_type        AS ENUM ('bill_of_lading','commercial_invoice','packing_list','certificate_of_origin','id_document','business_cert','bank_statement','other');
CREATE TYPE doc_status      AS ENUM ('pending','verified','rejected');
CREATE TYPE currency_code   AS ENUM ('USD','NGN','CNY');
CREATE TYPE tx_type         AS ENUM ('credit','debit');
CREATE TYPE notif_channel   AS ENUM ('in_app','email','sms');

-- ── USERS & PROFILES ───────────────────────────────────────
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT UNIQUE NOT NULL,
  phone             TEXT,
  password_hash     TEXT NOT NULL,
  role              user_role NOT NULL,
  full_name         TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  location_text     TEXT,
  location_lat      NUMERIC(9,6),
  location_lng      NUMERIC(9,6),
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE buyer_profiles (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  buyer_type        buyer_type NOT NULL,
  company_name      TEXT,               -- business/dealer/ngo
  registration_no    TEXT,               -- CAC / NGO reg no.
  bvn               TEXT,               -- Bank Verification Number (individual)
  bank_name         TEXT,
  bank_account_no   TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT,
  country           TEXT DEFAULT 'Nigeria',
  kyc_status        doc_status NOT NULL DEFAULT 'pending'
);

CREATE TABLE supplier_profiles (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name      TEXT NOT NULL,
  registration_no   TEXT,
  city              TEXT,
  country           TEXT DEFAULT 'China',
  swift_code        TEXT,
  bank_name         TEXT,
  bank_account_no   TEXT,
  verified_supplier BOOLEAN NOT NULL DEFAULT FALSE,
  rating            NUMERIC(2,1) DEFAULT 0.0
);

CREATE TABLE bank_profiles (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bank_name         TEXT NOT NULL,
  swift_code        TEXT,
  branch            TEXT,
  officer_name      TEXT,
  officer_title     TEXT
);

-- ── PRODUCTS (supplier catalogue) ──────────────────────────
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  category          TEXT,
  unit_price_usd    NUMERIC(14,2) NOT NULL,
  min_order_qty     TEXT,
  hs_code           TEXT,
  lead_time         TEXT,
  description       TEXT,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── ORDERS ─────────────────────────────────────────────────
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference         TEXT UNIQUE NOT NULL,           -- e.g. VTG-2024-010
  buyer_id          UUID NOT NULL REFERENCES users(id),
  supplier_id       UUID NOT NULL REFERENCES users(id),
  bank_id           UUID REFERENCES users(id),
  status            order_status NOT NULL DEFAULT 'pending',
  total_amount_usd  NUMERIC(14,2) NOT NULL,
  currency          currency_code NOT NULL DEFAULT 'USD',
  incoterm          TEXT DEFAULT 'FOB',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id),
  description       TEXT NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 1,
  unit_price_usd    NUMERIC(14,2) NOT NULL
);

-- ── SHIPMENT TRACKING ──────────────────────────────────────
CREATE TABLE shipments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  container_no      TEXT,
  carrier           TEXT,
  origin_port       TEXT,
  destination_port  TEXT DEFAULT 'Tin Can Island, Lagos',
  percent_complete  INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tracking_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id       UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  location          TEXT NOT NULL,
  detail            TEXT,
  status            TEXT NOT NULL DEFAULT 'pending', -- done | active | pending
  event_time        TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order        INTEGER NOT NULL DEFAULT 0
);

-- ── LETTERS OF CREDIT ──────────────────────────────────────
CREATE TABLE letters_of_credit (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference         TEXT UNIQUE NOT NULL,           -- e.g. VTG-LC-2024-007
  order_id          UUID NOT NULL REFERENCES orders(id),
  buyer_id          UUID NOT NULL REFERENCES users(id),
  supplier_id       UUID NOT NULL REFERENCES users(id),
  issuing_bank_id   UUID REFERENCES users(id),
  issuing_bank_name TEXT,                          -- e.g. GTBank, Zenith (buyer's real-world bank; may not be a VTG user)
  amount_usd        NUMERIC(14,2) NOT NULL,
  status            lc_status NOT NULL DEFAULT 'requested',
  swift_mt700_ref   TEXT,
  swift_mt103_ref   TEXT,
  expiry_date       DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── WALLETS & TRANSACTIONS ─────────────────────────────────
CREATE TABLE wallet_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency          currency_code NOT NULL,
  balance           NUMERIC(16,2) NOT NULL DEFAULT 0,
  UNIQUE(user_id, currency)
);

CREATE TABLE wallet_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id         UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
  type              tx_type NOT NULL,
  amount            NUMERIC(16,2) NOT NULL,
  balance_after     NUMERIC(16,2) NOT NULL,
  counterparty_name TEXT,
  reference         TEXT,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PAYMENT REQUESTS (TT / Escrow / Crypto / Forex / D-P) ──
-- Generic table for the non-LC payment rails. `provider_ref` and
-- `raw_response` are where a real banking/PSP/crypto integration
-- would write its response once one exists; for now they stay NULL
-- and `status` is driven by PaymentProvider (services/paymentProviders).
CREATE TABLE payment_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID REFERENCES orders(id),
  initiated_by      UUID NOT NULL REFERENCES users(id),
  method            payment_method NOT NULL,
  amount            NUMERIC(16,2) NOT NULL,
  currency          currency_code NOT NULL,
  status            payment_status NOT NULL DEFAULT 'pending',
  counterparty_name TEXT,
  provider_ref      TEXT,
  raw_response      JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── FOREX RATES (for the FX / crypto-out calculators) ──────
CREATE TABLE forex_rates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency     currency_code NOT NULL,
  quote_currency    currency_code NOT NULL,
  rate              NUMERIC(14,6) NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(base_currency, quote_currency)
);

-- ── DOCUMENTS ──────────────────────────────────────────────
CREATE TABLE documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by       UUID NOT NULL REFERENCES users(id),
  order_id          UUID REFERENCES orders(id),
  lc_id             UUID REFERENCES letters_of_credit(id),
  doc_type          doc_type NOT NULL,
  file_name         TEXT NOT NULL,
  file_path         TEXT NOT NULL,
  file_size_bytes   INTEGER,
  status            doc_status NOT NULL DEFAULT 'pending',
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── MESSAGING ──────────────────────────────────────────────
CREATE TABLE conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID REFERENCES orders(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation_participants (
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES users(id),
  body              TEXT NOT NULL,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── NOTIFICATIONS ──────────────────────────────────────────
CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  body              TEXT,
  channel           notif_channel NOT NULL DEFAULT 'in_app',
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── COMPLIANCE / AUDIT LOG ─────────────────────────────────
CREATE TABLE audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id          UUID REFERENCES users(id),
  action            TEXT NOT NULL,
  detail            TEXT,
  ip_address        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE country_compliance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_name      TEXT NOT NULL,
  country_code      TEXT NOT NULL,
  crypto_allowed    BOOLEAN NOT NULL DEFAULT FALSE,
  forex_allowed     BOOLEAN NOT NULL DEFAULT TRUE,
  notes             TEXT
);

-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX idx_orders_buyer       ON orders(buyer_id);
CREATE INDEX idx_orders_supplier    ON orders(supplier_id);
CREATE INDEX idx_lc_order           ON letters_of_credit(order_id);
CREATE INDEX idx_wallet_tx_wallet   ON wallet_transactions(wallet_id);
CREATE INDEX idx_payment_req_order  ON payment_requests(order_id);
CREATE INDEX idx_documents_order    ON documents(order_id);
CREATE INDEX idx_messages_conv      ON messages(conversation_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_audit_actor        ON audit_log(actor_id);
CREATE INDEX idx_products_supplier  ON products(supplier_id);
