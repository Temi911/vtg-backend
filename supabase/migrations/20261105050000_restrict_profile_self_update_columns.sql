-- Prevent signed-in users from promoting themselves or changing account status.
-- Profile owners may edit ordinary profile details only. Role/status changes remain
-- restricted to trusted server-side admin workflows.
revoke update on table public.profiles from authenticated;
revoke update (
  id, email, full_name, phone, preferred_language, country, city,
  is_active, role, created_at, updated_at
) on table public.profiles from authenticated;
grant update (full_name, phone, preferred_language, country, city)
  on table public.profiles to authenticated;