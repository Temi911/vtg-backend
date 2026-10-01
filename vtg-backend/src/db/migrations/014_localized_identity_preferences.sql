-- VTG localized account identity and communication preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS vtg_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_subscribed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_unsubscribe_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_vtg_user_id ON users(vtg_user_id) WHERE vtg_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_marketing_unsubscribe_token ON users(marketing_unsubscribe_token) WHERE marketing_unsubscribe_token IS NOT NULL;

UPDATE users
SET vtg_user_id = 'VTG-AF-' || UPPER(SUBSTRING(role,1,3)) || '-' || UPPER(SUBSTRING(REPLACE(id::text,'-',''),1,8))
WHERE vtg_user_id IS NULL;
