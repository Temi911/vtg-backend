-- ============================================================
-- VTG Africa — Seed data
-- Matches the sample data already visible in the frontend mockup
-- so the API "just works" out of the box.
-- Password for every seeded user is: Password123
-- (bcrypt hash generated in db/seed.js — this file is SQL-only
--  reference; the actual runnable seed is db/seed.js)
-- ============================================================

-- Forex rates (mock — replace with a live FX feed later)
INSERT INTO forex_rates (base_currency, quote_currency, rate) VALUES
  ('USD','NGN', 1620.50),
  ('USD','CNY', 7.24),
  ('NGN','USD', 0.000617),
  ('CNY','USD', 0.1381)
ON CONFLICT (base_currency, quote_currency) DO NOTHING;

-- Country crypto/forex compliance (mirrors the compliance table in the UI)
INSERT INTO country_compliance (country_name, country_code, crypto_allowed, forex_allowed, notes) VALUES
  ('Nigeria','NG', false, true, 'Crypto payments for trade settlement not CBN-recognised; use LC/TT/Escrow'),
  ('China','CN', false, true, 'PBOC restricts crypto for cross-border settlement'),
  ('Ghana','GH', true, true, 'BoG permits licensed VASPs'),
  ('Kenya','KE', true, true, 'CMA licensing required'),
  ('South Africa','ZA', true, true, 'FSCA-licensed VASPs only'),
  ('United Arab Emirates','AE', true, true, 'VARA-licensed exchanges'),
  ('Singapore','SG', true, true, 'MAS-licensed payment institutions'),
  ('Ethiopia','ET', false, false, 'Crypto and most forex restricted');
