-- ============================================================
-- VTG Marketplace + Social + Realtime Collaboration
-- Migration 004
-- PostgreSQL 14+
-- ============================================================

-- Supplier storefronts / company pages
CREATE TABLE IF NOT EXISTS storefronts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  website_url TEXT,
  company_email TEXT,
  company_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  logo_url TEXT,
  cover_image_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storefronts_country ON storefronts(country);
CREATE INDEX IF NOT EXISTS idx_storefronts_location ON storefronts(latitude, longitude);

-- Product media: multiple pictures, videos and advert assets per product
CREATE TABLE IF NOT EXISTS product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video','document')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_media_product ON product_media(product_id, sort_order);

-- Company gallery / adverts / videos
CREATE TABLE IF NOT EXISTS company_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES storefronts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video','advert','document')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_media_storefront ON company_media(storefront_id, sort_order);

-- Public social/trade feed
CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storefront_id UUID REFERENCES storefronts(id) ON DELETE SET NULL,
  post_type TEXT NOT NULL DEFAULT 'update' CHECK (post_type IN ('update','product','advert','news','announcement','trade_tip','video')),
  body TEXT,
  external_url TEXT,
  country_code TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_country ON feed_posts(country_code, created_at DESC);

CREATE TABLE IF NOT EXISTS feed_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_feed_post_media_post ON feed_post_media(post_id, sort_order);

CREATE TABLE IF NOT EXISTS feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON feed_comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS feed_reactions (
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(post_id, user_id, reaction)
);

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(follower_id, following_id),
  CHECK(follower_id <> following_id)
);

-- Rich catalogue fields for marketplace discovery
ALTER TABLE products ADD COLUMN IF NOT EXISTS storefront_id UUID REFERENCES storefronts(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'available';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(14,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_label TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
CREATE INDEX IF NOT EXISTS idx_products_storefront ON products(storefront_id);
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category, is_active);

-- Chat attachments, quote/enquiry context and delivery receipts
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Marketplace enquiries connecting buyer, supplier and optional bank
CREATE TABLE IF NOT EXISTS trade_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bank_id UUID REFERENCES users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','quoted','accepted','closed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trade_enquiries_buyer ON trade_enquiries(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_enquiries_supplier ON trade_enquiries(supplier_id, created_at DESC);

-- Live video call sessions. Actual audio/video uses WebRTC or a managed provider;
-- this table stores secure room/session metadata and participant state.
CREATE TABLE IF NOT EXISTS video_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  enquiry_id UUID REFERENCES trade_enquiries(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_token_hash TEXT,
  provider TEXT NOT NULL DEFAULT 'webrtc',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','ringing','active','ended','cancelled')),
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_video_calls_conversation ON video_call_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_enquiry ON video_call_sessions(enquiry_id);

CREATE TABLE IF NOT EXISTS video_call_participants (
  call_id UUID NOT NULL REFERENCES video_call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  PRIMARY KEY(call_id, user_id)
);

-- Support, complaints and company enquiries
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  opened_by UUID REFERENCES users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK(category IN ('general_enquiry','complaint','technical','payment','shipping','customs','verification','supplier','bank','other')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','waiting_user','resolved','closed')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(opened_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, priority);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id, created_at);

-- Country-aware rotating page backgrounds. URLs point to approved media storage/CDN assets.
CREATE TABLE IF NOT EXISTS page_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL,
  country_code TEXT,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK(media_type IN ('image','video')),
  media_url TEXT NOT NULL,
  alt_text TEXT,
  overlay_strength NUMERIC(3,2) NOT NULL DEFAULT 0.35,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_page_backgrounds_page_country ON page_backgrounds(page_key, country_code, is_active, sort_order);

-- Supplier external company links (official site, catalogues, social profiles, etc.)
CREATE TABLE IF NOT EXISTS storefront_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES storefronts(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  link_type TEXT DEFAULT 'website',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_storefront_links_storefront ON storefront_links(storefront_id, sort_order);

-- Seed no user data here. Country-specific images and external links should be added
-- only after the media URLs have been approved and stored in the configured object storage/CDN.
