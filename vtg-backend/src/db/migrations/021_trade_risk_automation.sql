CREATE TABLE IF NOT EXISTS trade_risk_assessments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
 level TEXT NOT NULL CHECK (level IN ('low','medium','high','critical')),
 factors JSONB NOT NULL DEFAULT '[]'::jsonb,
 recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
 assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(order_id)
);
CREATE INDEX IF NOT EXISTS idx_trade_risk_level ON trade_risk_assessments(level,assessed_at DESC);
CREATE TABLE IF NOT EXISTS trade_automation_actions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
 action_type TEXT NOT NULL,
 priority TEXT NOT NULL CHECK (priority IN ('low','medium','high','critical')),
 status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
 title TEXT NOT NULL,
 detail TEXT,
 due_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(order_id,action_type)
);
CREATE INDEX IF NOT EXISTS idx_trade_automation_open ON trade_automation_actions(status,priority,created_at DESC);