-- Roll back the VTG chat and AI attachment feature introduced in PR #46.
-- Supabase protects storage catalog mutations from direct SQL. The two feature buckets
-- are left private and empty; no application code references them after this rollback.
drop policy if exists "Chat participants read attachment objects" on storage.objects;
drop policy if exists "Chat participants upload attachment objects" on storage.objects;
drop policy if exists "Uploaders delete own attachment objects" on storage.objects;
drop policy if exists "Users read own AI attachment objects" on storage.objects;
drop policy if exists "Users upload own AI attachment objects" on storage.objects;
drop policy if exists "Users delete own AI attachment objects" on storage.objects;

alter publication supabase_realtime drop table public.vtg_chat_attachments;

drop table if exists public.vtg_ai_attachments;
drop table if exists public.vtg_chat_attachments;
