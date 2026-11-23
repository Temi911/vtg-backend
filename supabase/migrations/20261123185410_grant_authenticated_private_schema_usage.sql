-- Allow authenticated database operations to resolve the narrowly granted
-- private.vtg_is_admin() helper used by the products review guard trigger.
-- The private schema remains unavailable to anon; function EXECUTE grants
-- remain individually controlled and are not broadened here.
grant usage on schema private to authenticated;
