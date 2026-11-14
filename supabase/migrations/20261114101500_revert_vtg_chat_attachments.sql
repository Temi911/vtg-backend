-- Roll back the VTG chat and AI attachment feature introduced in PR #46.
-- This intentionally removes any files uploaded to the two feature-specific buckets.
drop policy if exists "Chat participants read attachment objects" on storage.objects;
drop policy if exists "Chat participants upload attachment objects" on storage.objects;
drop policy if exists "Uploaders delete own attachment objects" on storage.objects;
drop policy if exists "Users read own AI attachment objects" on storage.objects;
drop policy if exists "Users upload own AI attachment objects" on storage.objects;
drop policy if exists "Users delete own AI attachment objects" on storage.objects;

alter publication supabase_realtime drop table public.vtg_chat_attachments;

delete from storage.objects
where bucket_id in ('vtg-chat-attachments','vtg-ai-attachments');

delete from storage.buckets
where id in ('vtg-chat-attachments','vtg-ai-attachments');

drop table if exists public.vtg_ai_attachments;
drop table if exists public.vtg_chat_attachments;
