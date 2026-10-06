-- Phase 12: supplier product media
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
CREATE INDEX IF NOT EXISTS idx_products_supplier_active_created ON products(supplier_id, is_active, created_at DESC);
