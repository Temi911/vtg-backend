-- Private attachments for VTG AI chat and buyer/supplier/bank chats.
-- AI files live in a per-user folder (<user_id>/<file>) and carry no table: the Edge Function reads them with the caller's JWT, so storage RLS is the boundary.
-- Chat files live in <conversation_id>/<user_id>/<file>; metadata sits in vtg_chat_attachments, readable only by conversation members.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
 ('vtg-chat-attachments','vtg-chat-attachments',false,26214400,array['application/pdf','text/plain','text/csv','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']),
 ('vtg-ai-attachments','vtg-ai-attachments',false,20971520,array['application/pdf','text/plain','text/csv','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.vtg_chat_attachments (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 message_id uuid not null references public.messages(id) on delete cascade,
 uploaded_by uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique,
 original_name text not null check(char_length(original_name) between 1 and 255),
 mime_type text not null,
 size_bytes bigint not null check(size_bytes>0 and size_bytes<=26214400),
 attachment_type text not null check(attachment_type in ('document','image','video','other')),
 created_at timestamptz not null default now(),
 check(storage_path like conversation_id::text||'/'||uploaded_by::text||'/%')
);
create index if not exists vtg_chat_attachments_message_idx on public.vtg_chat_attachments(message_id);
create index if not exists vtg_chat_attachments_conversation_idx on public.vtg_chat_attachments(conversation_id,created_at);
alter table public.vtg_chat_attachments enable row level security;
revoke all on public.vtg_chat_attachments from anon,public;
grant select,insert,delete on public.vtg_chat_attachments to authenticated;
drop policy if exists "members read chat attachments" on public.vtg_chat_attachments;
create policy "members read chat attachments" on public.vtg_chat_attachments for select to authenticated using (private.vtg_is_conversation_member(conversation_id));
drop policy if exists "members attach to own messages" on public.vtg_chat_attachments;
create policy "members attach to own messages" on public.vtg_chat_attachments for insert to authenticated with check (
 uploaded_by=(select auth.uid()) and private.vtg_is_conversation_member(conversation_id)
 and exists(select 1 from public.messages m where m.id=message_id and m.conversation_id=vtg_chat_attachments.conversation_id and m.sender_id=(select auth.uid())));
drop policy if exists "uploaders delete own chat attachments" on public.vtg_chat_attachments;
create policy "uploaders delete own chat attachments" on public.vtg_chat_attachments for delete to authenticated using (uploaded_by=(select auth.uid()));

drop policy if exists "chat members read attachment objects" on storage.objects;
create policy "chat members read attachment objects" on storage.objects for select to authenticated using (
 bucket_id='vtg-chat-attachments' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and private.vtg_is_conversation_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "chat members upload attachment objects" on storage.objects;
create policy "chat members upload attachment objects" on storage.objects for insert to authenticated with check (
 bucket_id='vtg-chat-attachments' and (storage.foldername(name))[2]=(select auth.uid())::text
 and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and private.vtg_is_conversation_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "uploaders delete chat attachment objects" on storage.objects;
create policy "uploaders delete chat attachment objects" on storage.objects for delete to authenticated using (
 bucket_id='vtg-chat-attachments' and (storage.foldername(name))[2]=(select auth.uid())::text);

drop policy if exists "users read own AI attachment objects" on storage.objects;
create policy "users read own AI attachment objects" on storage.objects for select to authenticated using (bucket_id='vtg-ai-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "users upload own AI attachment objects" on storage.objects;
create policy "users upload own AI attachment objects" on storage.objects for insert to authenticated with check (bucket_id='vtg-ai-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "users delete own AI attachment objects" on storage.objects;
create policy "users delete own AI attachment objects" on storage.objects for delete to authenticated using (bucket_id='vtg-ai-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);

do $$ begin
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='vtg_chat_attachments') then
  alter publication supabase_realtime add table public.vtg_chat_attachments;
 end if;
end $$;
