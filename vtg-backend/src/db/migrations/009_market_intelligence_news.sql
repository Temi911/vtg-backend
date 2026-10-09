CREATE TABLE IF NOT EXISTS market_intelligence_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_name TEXT NOT NULL DEFAULT 'External source',
  source_domain TEXT,
  source_url TEXT NOT NULL UNIQUE,
  published_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  topic TEXT NOT NULL DEFAULT 'Trade & logistics',
  relevance_score INTEGER NOT NULL DEFAULT 0 CHECK (relevance_score BETWEEN 0 AND 10),
  editorial_summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','rejected')),
  provider TEXT NOT NULL DEFAULT 'GDELT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mi_news_published ON market_intelligence_news(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_mi_news_topic ON market_intelligence_news(topic, discovered_at DESC);
