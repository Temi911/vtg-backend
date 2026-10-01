-- VTG quote workflow
-- Quotes sit before orders and can be converted only after acceptance.

CREATE TYPE quote_status AS ENUM ('draft','sent','accepted','rejected','expired','converted');

CREATE TABLE trade_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES users(id),
  supplier_id UUID NOT NULL REFERENCES users(id),
  status quote_status NOT NULL DEFAULT 'draft',
  currency currency_code NOT NULL DEFAULT 'USD',
  total_amount_usd NUMERIC(14,2) NOT NULL,
  incoterm TEXT NOT NULL DEFAULT 'FOB',
  validity_until DATE,
  notes TEXT,
  converted_order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE trade_quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES trade_quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_usd NUMERIC(14,2) NOT NULL CHECK (unit_price_usd > 0)
);

CREATE INDEX idx_trade_quotes_buyer ON trade_quotes(buyer_id);
CREATE INDEX idx_trade_quotes_supplier ON trade_quotes(supplier_id);
CREATE INDEX idx_trade_quote_items_quote ON trade_quote_items(quote_id);
