-- The supplier catalogue UI writes directly to public.products through Supabase.
-- RLS policies still restrict each supplier to their own rows and active trade account.
grant insert, update on table public.products to authenticated;
