alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.messages add column if not exists deleted_by uuid references auth.users(id);
alter table public.messages add column if not exists hidden_at timestamptz;
create table if not exists public.vtg_chat_clear_requests (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
 requested_by uuid not null references auth.users(id), status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), resolved_at timestamptz);
create table if not exists public.vtg_chat_clear_responses (
 request_id uuid not null references public.vtg_chat_clear_requests(id) on delete cascade,
 user_id uuid not null references auth.users(id), approved boolean not null, responded_at timestamptz not null default now(),
 primary key(request_id,user_id));
alter table public.vtg_chat_clear_requests enable row level security;
alter table public.vtg_chat_clear_responses enable row level security;
revoke all on public.vtg_chat_clear_requests,public.vtg_chat_clear_responses from anon,authenticated;
create or replace function public.vtg_delete_message(p_message_id uuid) returns jsonb
language plpgsql security definer set search_path=public,private as $$
declare v_uid uuid:=auth.uid(); v_msg public.messages%rowtype;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into v_msg from public.messages where id=p_message_id for update;
 if not found or v_msg.sender_id<>v_uid or not private.vtg_is_conversation_member(v_msg.conversation_id) then raise exception 'You can only delete your own message' using errcode='42501'; end if;
 update public.messages set body='',deleted_at=now(),deleted_by=v_uid where id=p_message_id;
 return jsonb_build_object('ok',true,'message_id',p_message_id);
end $$;
create or replace function public.vtg_request_chat_clear(p_conversation_id uuid) returns jsonb
language plpgsql security definer set search_path=public,private as $$
declare v_uid uuid:=auth.uid();v_req uuid;v_total integer;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if not private.vtg_is_conversation_member(p_conversation_id) then raise exception 'You are not a participant in this chat' using errcode='42501'; end if;
 if exists(select 1 from public.vtg_chat_clear_requests where conversation_id=p_conversation_id and status='pending') then return jsonb_build_object('ok',false,'message','A clear request is already pending.'); end if;
 insert into public.vtg_chat_clear_requests(conversation_id,requested_by) values(p_conversation_id,v_uid) returning id into v_req;
 insert into public.vtg_chat_clear_responses(request_id,user_id,approved) values(v_req,v_uid,true);
 insert into public.vtg_notifications(user_id,title,body,notification_type,entity_type,entity_id)
 select cp.user_id,'Chat clear request','A participant wants to clear this chat. Open VTG messages to agree or decline.','chat_clear_request','conversation',p_conversation_id
 from public.conversation_participants cp where cp.conversation_id=p_conversation_id and cp.user_id<>v_uid;
 select count(*) into v_total from public.conversation_participants where conversation_id=p_conversation_id;
 if v_total=1 then update public.messages set hidden_at=now() where conversation_id=p_conversation_id and hidden_at is null;
 update public.vtg_chat_clear_requests set status='approved',resolved_at=now() where id=v_req;
 return jsonb_build_object('ok',true,'cleared',true,'message','Chat cleared.'); end if;
 return jsonb_build_object('ok',true,'request_id',v_req,'message','Request sent. All other participants have been notified.');
end $$;
create or replace function public.vtg_respond_chat_clear(p_request_id uuid,p_approve boolean) returns jsonb
language plpgsql security definer set search_path=public,private as $$
declare v_uid uuid:=auth.uid();v_req public.vtg_chat_clear_requests%rowtype;v_total integer;v_yes integer;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into v_req from public.vtg_chat_clear_requests where id=p_request_id for update;
 if not found or not private.vtg_is_conversation_member(v_req.conversation_id) then raise exception 'Clear request not found for this chat' using errcode='42501'; end if;
 if v_req.status<>'pending' then return jsonb_build_object('ok',false,'message','This request is already resolved.'); end if;
 insert into public.vtg_chat_clear_responses(request_id,user_id,approved) values(p_request_id,v_uid,p_approve)
 on conflict(request_id,user_id) do update set approved=excluded.approved,responded_at=now();
 if not p_approve then
  update public.vtg_chat_clear_requests set status='rejected',resolved_at=now() where id=p_request_id;
  insert into public.vtg_notifications(user_id,title,body,notification_type,entity_type,entity_id)
  select cp.user_id,'Chat clear declined','A participant declined. Your chat history remains unchanged.','chat_clear_result','conversation',v_req.conversation_id
  from public.conversation_participants cp where cp.conversation_id=v_req.conversation_id;
  return jsonb_build_object('ok',true,'cleared',false,'message','You declined. Chat history remains unchanged.');
 end if;
 select count(*) into v_total from public.conversation_participants where conversation_id=v_req.conversation_id;
 select count(*) into v_yes from public.vtg_chat_clear_responses r join public.conversation_participants cp on cp.user_id=r.user_id and cp.conversation_id=v_req.conversation_id where r.request_id=p_request_id and r.approved;
 if v_yes>=v_total then
  update public.messages set hidden_at=now() where conversation_id=v_req.conversation_id and hidden_at is null;
  update public.vtg_chat_clear_requests set status='approved',resolved_at=now() where id=p_request_id;
  insert into public.vtg_notifications(user_id,title,body,notification_type,entity_type,entity_id)
  select cp.user_id,'Chat cleared','Everyone agreed. Chat history is now cleared for all participants.','chat_clear_result','conversation',v_req.conversation_id
  from public.conversation_participants cp where cp.conversation_id=v_req.conversation_id;
  return jsonb_build_object('ok',true,'cleared',true,'message','Everyone agreed. Chat cleared for all participants.');
 end if;
 insert into public.vtg_notifications(user_id,title,body,notification_type,entity_type,entity_id)
 values(v_req.requested_by,'Chat clear approval','A participant agreed. Waiting for everyone else.','chat_clear_result','conversation',v_req.conversation_id);
 return jsonb_build_object('ok',true,'cleared',false,'message','Approval recorded. Waiting for everyone else.');
end $$;
revoke all on function public.vtg_delete_message(uuid) from public,anon;
revoke all on function public.vtg_request_chat_clear(uuid) from public,anon;
revoke all on function public.vtg_respond_chat_clear(uuid,boolean) from public,anon;
grant execute on function public.vtg_delete_message(uuid) to authenticated;
grant execute on function public.vtg_request_chat_clear(uuid) to authenticated;
grant execute on function public.vtg_respond_chat_clear(uuid,boolean) to authenticated;
create or replace function public.vtg_pending_chat_clear(p_conversation_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_req public.vtg_chat_clear_requests%rowtype;
begin
 if auth.uid() is null or not private.vtg_is_conversation_member(p_conversation_id) then raise exception 'You are not a participant in this chat' using errcode='42501'; end if;
 select * into v_req from public.vtg_chat_clear_requests where conversation_id=p_conversation_id and status='pending' order by created_at desc limit 1;
 if not found then return null; end if;
 return jsonb_build_object('id',v_req.id,'requested_by',v_req.requested_by,'created_at',v_req.created_at);
end $$;
revoke all on function public.vtg_pending_chat_clear(uuid) from public,anon;
grant execute on function public.vtg_pending_chat_clear(uuid) to authenticated;
