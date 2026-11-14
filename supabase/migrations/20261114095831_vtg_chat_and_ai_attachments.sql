insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
 ('vtg-chat-attachments','vtg-chat-attachments',false,104857600,array['application/pdf','text/plain','text/csv','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']),
 ('vtg-ai-attachments','vtg-ai-attachments',false,52428800,array['application/pdf','text/plain','text/csv','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.vtg_chat_attachments (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 message_id uuid not null references public.messages(id) on delete cascade,
 uploaded_by uuid not null references auth.users(id) on delete cascade,
 bucket_id text not null default 'vtg-chat-attachments' check(bucket_id='vtg-chat-attachments'),
 storage_path text not null unique,original_name text not null,mime_type text not null,
 size_bytes bigint not null check(size_bytes>0 and size_bytes<=104857600),
 attachment_type text not null check(attachment_type in ('document','image','video','other')),
 created_at timestamptz not null default now()
);
create index if not exists vtg_chat_attachments_message_idx on public.vtg_chat_attachments(message_id,created_at);
create index if not exists vtg_chat_attachments_conversation_idx on public.vtg_chat_attachments(conversation_id,created_at);
alter table public.vtg_chat_attachments enable row level security;
create policy "Chat participants read message attachments" on public.vtg_chat_attachments for select to authenticated using(exists(select 1 from public.conversation_participants cp where cp.conversation_id=vtg_chat_attachments.conversation_id and cp.user_id=(select auth.uid())));
create policy "Chat participants attach to own messages" on public.vtg_chat_attachments for insert to authenticated with check(uploaded_by=(select auth.uid()) and exists(select 1 from public.conversation_participants cp where cp.conversation_id=vtg_chat_attachments.conversation_id and cp.user_id=(select auth.uid())) and exists(select 1 from public.messages m where m.id=vtg_chat_attachments.message_id and m.conversation_id=vtg_chat_attachments.conversation_id and m.sender_id=(select auth.uid())));
create policy "Uploaders delete own chat attachments" on public.vtg_chat_attachments for delete to authenticated using(uploaded_by=(select auth.uid()) and exists(select 1 from public.conversation_participants cp where cp.conversation_id=vtg_chat_attachments.conversation_id and cp.user_id=(select auth.uid())));

create table if not exists public.vtg_ai_attachments (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 bucket_id text not null default 'vtg-ai-attachments' check(bucket_id='vtg-ai-attachments'),
 storage_path text not null unique,original_name text not null,mime_type text not null,
 size_bytes bigint not null check(size_bytes>0 and size_bytes<=52428800),
 attachment_type text not null check(attachment_type in ('document','image','video','other')),
 processing_status text not null default 'uploaded' check(processing_status in ('uploaded','processing','ready','unsupported','failed')),
 extracted_text text,created_at timestamptz not null default now()
);
create index if not exists vtg_ai_attachments_owner_idx on public.vtg_ai_attachments(owner_id,created_at desc);
alter table public.vtg_ai_attachments enable row level security;
create policy "Users manage own AI attachments" on public.vtg_ai_attachments for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create policy "Chat participants read attachment objects" on storage.objects for select to authenticated using(bucket_id='vtg-chat-attachments' and exists(select 1 from public.conversation_participants cp where cp.conversation_id::text=(storage.foldername(name))[1] and cp.user_id=(select auth.uid())));
create policy "Chat participants upload attachment objects" on storage.objects for insert to authenticated with check(bucket_id='vtg-chat-attachments' and (storage.foldername(name))[2]=(select auth.uid())::text and exists(select 1 from public.conversation_participants cp where cp.conversation_id::text=(storage.foldername(name))[1] and cp.user_id=(select auth.uid())));
create policy "Uploaders delete own attachment objects" on storage.objects for delete to authenticated using(bucket_id='vtg-chat-attachments' and (storage.foldername(name))[2]=(select auth.uid())::text and exists(select 1 from public.conversation_participants cp where cp.conversation_id::text=(storage.foldername(name))[1] and cp.user_id=(select auth.uid())));
create policy "Users read own AI attachment objects" on storage.objects for select to authenticated using(bucket_id='vtg-ai-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Users upload own AI attachment objects" on storage.objects for insert to authenticated with check(bucket_id='vtg-ai-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Users delete own AI attachment objects" on storage.objects for delete to authenticated using(bucket_id='vtg-ai-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
