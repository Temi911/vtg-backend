-- Preserve explicit opt-in choices already recorded in Supabase Auth signup metadata.
-- Missing or malformed consent remains opted out; existing preference rows are never overwritten.
insert into public.vtg_email_preferences(user_id,marketing_subscribed,updated_at)
select
  u.id,
  lower(coalesce(u.raw_user_meta_data->>'marketing_subscribed','false')) = 'true',
  now()
from auth.users u
on conflict (user_id) do nothing;
