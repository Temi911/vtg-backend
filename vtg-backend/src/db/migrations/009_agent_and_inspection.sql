-- VTG Agent Network + optional Product Verification
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'agent';

CREATE TABLE IF NOT EXISTS agent_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  regions_served TEXT,
  experience_years INTEGER NOT NULL DEFAULT 0,
  categories TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payout_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_location ON agent_profiles(country, city);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_status ON agent_profiles(status);

CREATE TABLE IF NOT EXISTS inspection_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  category TEXT NOT NULL,
  service_level TEXT NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  max_quantity INTEGER,
  buyer_fee_usd NUMERIC(10,2) NOT NULL,
  agent_payout_usd NUMERIC(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(country, category, service_level, min_quantity)
);

CREATE TABLE IF NOT EXISTS inspection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  supplier_name TEXT,
  supplier_address TEXT,
  supplier_contact TEXT,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  service_level TEXT NOT NULL DEFAULT 'standard',
  requested_checks TEXT,
  add_video BOOLEAN NOT NULL DEFAULT FALSE,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  buyer_fee_usd NUMERIC(10,2) NOT NULL,
  agent_payout_usd NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  assigned_agent_id UUID REFERENCES users(id),
  buyer_decision TEXT,
  buyer_notes TEXT,
  inspection_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_requests_buyer ON inspection_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_inspection_requests_agent ON inspection_requests(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_inspection_requests_status ON inspection_requests(status);

CREATE TABLE IF NOT EXISTS inspection_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspection_requests(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  evidence_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_evidence_inspection ON inspection_evidence(inspection_id);

CREATE TABLE IF NOT EXISTS agent_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID UNIQUE NOT NULL REFERENCES inspection_requests(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id),
  amount_usd NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Starter pricing examples. Admin can change these later.
INSERT INTO inspection_pricing_rules (country, category, service_level, min_quantity, max_quantity, buyer_fee_usd, agent_payout_usd)
VALUES
('China','clothing','basic',1,500,30,20),
('China','bags','basic',1,300,35,23),
('China','electronics','standard',1,500,55,36),
('China','phones-tablets','standard',1,100,65,42),
('China','furniture','standard',1,50,75,50),
('China','appliances','standard',1,100,70,46),
('China','machinery','advanced',1,10,150,100),
('China','general-merchandise','basic',1,500,35,23),
('South Korea','clothing','basic',1,500,35,23),
('South Korea','electronics','standard',1,500,60,39),
('South Korea','machinery','advanced',1,10,160,105),
('South Korea','general-merchandise','basic',1,500,40,26)
ON CONFLICT DO NOTHING;
