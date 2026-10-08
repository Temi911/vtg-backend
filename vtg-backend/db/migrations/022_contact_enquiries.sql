-- VTG Contact Service Desk enquiries
CREATE TABLE IF NOT EXISTS contact_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  category TEXT NOT NULL,
  team TEXT NOT NULL,
  topic TEXT,
  subject TEXT NOT NULL,
  reference_context TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','assigned','in_progress','resolved','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_enquiries_team_status ON contact_enquiries(team,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_enquiries_email ON contact_enquiries(email,created_at DESC);
