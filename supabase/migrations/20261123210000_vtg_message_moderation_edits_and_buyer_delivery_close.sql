-- VTG chat moderation, safe message editing, and buyer-confirmed delivery closure.
-- Moderation events retain category/count only; rejected message content is never stored.
create table if not exists private.vtg_message_moderation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  category text not null check (category in ('sexual_content','harassment_or_abuse','threat_or_violence')),
  created_at timestamptz not null default now()
);
create index if not exists vtg_message_moderation_user_time_idx
  on private.vtg_message_moderation_events(user_id, created_at desc);
alter table private.vtg_message_moderation_events enable row level security;
revoke all on private.vtg_message_moderation_events from public, anon, authenticated;

create or replace function private.vtg_message_content_violation(p_body text)
returns text language plpgsql immutable set search_path = ''
as $function$
declare v text := lower(coalesce(p_body,''));
begin
  if v ~* '(^|[^[:alnum:]_])(porn|pornography|xxx|nudes?|send me (nudes|naked pictures)|explicit (photos|pictures|images)|sexual (services|favou?rs|content)|hook ?up)([^[:alnum:]_]|$)' then return 'sexual_content'; end if;
  if v ~* '(^|[^[:alnum:]_])(bitch|whore|slut|faggot|retard|cunt|motherfucker|son of a bitch|go die|you are worthless)([^[:alnum:]_]|$)' then return 'harassment_or_abuse'; end if;
  if v ~* '(^|[^[:alnum:]_])(i will kill you|kill you|hurt you|shoot you|stab you|rape you|beat you up|bomb you|burn you alive|i will find you and hurt you)([^[:alnum:]_]|$)' then return 'threat_or_violence'; end if;
  return null;
end;
$function$;
revoke all on function private.vtg_message_content_violation(text) from public, anon, authenticated;

alter table public.messages add column if not exists edited_at timestamptz;
drop policy if exists "message sender or admin update" on public.messages;
revoke update on public.messages from anon, authenticated;

drop function if exists public.vtg_send_message(uuid,text);
create function public.vtg_send_message(p_conversation_id uuid,p_body text)
returns jsonb language plpgsql security definer
set search_path = public, private, pg_temp
as $function$
declare v_user_id uuid:=auth.uid(); v_message_id uuid; v_body text:=btrim(coalesce(p_body,'')); v_category text; v_warnings integer;
begin
  if v_user_id is null then raise exception 'Sign in required to send a message' using errcode='42501'; end if;
  if p_conversation_id is null then raise exception 'Choose a conversation before sending a message'; end if;
  if length(v_body)<1 or length(v_body)>4000 then raise exception 'Messages must contain between 1 and 4000 characters'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_user_id and p.is_active=true) then raise exception 'An active VTG account is required to send messages' using errcode='42501'; end if;
  if not private.vtg_is_conversation_member(p_conversation_id) then raise exception 'You are not a participant in this conversation' using errcode='42501'; end if;
  v_category:=private.vtg_message_content_violation(v_body);
  if v_category is not null then
    insert into private.vtg_message_moderation_events(user_id,conversation_id,category) values(v_user_id,p_conversation_id,v_category);
    select count(*)::integer into v_warnings from private.vtg_message_moderation_events where user_id=v_user_id and created_at>=now()-interval '30 days';
    return jsonb_build_object('ok',false,'violation',true,'category',v_category,'warning_count',v_warnings,
      'message','This message was not sent. VTG does not allow sexually explicit, abusive, or threatening messages. Please rewrite it respectfully.');
  end if;
  insert into public.messages(conversation_id,sender_id,body) values(p_conversation_id,v_user_id,v_body) returning id into v_message_id;
  return jsonb_build_object('ok',true,'message_id',v_message_id);
end;
$function$;
revoke all on function public.vtg_send_message(uuid,text) from public, anon;
grant execute on function public.vtg_send_message(uuid,text) to authenticated;

create or replace function public.vtg_edit_message(p_message_id uuid,p_body text)
returns jsonb language plpgsql security definer
set search_path = public, private, pg_temp
as $function$
declare v_user_id uuid:=auth.uid(); v_message public.messages%rowtype; v_body text:=btrim(coalesce(p_body,'')); v_category text; v_warnings integer;
begin
  if v_user_id is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if length(v_body)<1 or length(v_body)>4000 then raise exception 'Messages must contain between 1 and 4000 characters'; end if;
  select * into v_message from public.messages where id=p_message_id for update;
  if not found or v_message.sender_id<>v_user_id or not private.vtg_is_conversation_member(v_message.conversation_id) then
    raise exception 'You can only edit your own message in this conversation' using errcode='42501';
  end if;
  if v_message.created_at<now()-interval '15 minutes' then raise exception 'Messages can only be edited for 15 minutes after sending'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_user_id and p.is_active=true) then raise exception 'An active VTG account is required' using errcode='42501'; end if;
  v_category:=private.vtg_message_content_violation(v_body);
  if v_category is not null then
    insert into private.vtg_message_moderation_events(user_id,conversation_id,category) values(v_user_id,v_message.conversation_id,v_category);
    select count(*)::integer into v_warnings from private.vtg_message_moderation_events where user_id=v_user_id and created_at>=now()-interval '30 days';
    return jsonb_build_object('ok',false,'violation',true,'category',v_category,'warning_count',v_warnings,
      'message','Your edit was not saved. VTG does not allow sexually explicit, abusive, or threatening messages. Please rewrite it respectfully.');
  end if;
  update public.messages set body=v_body,edited_at=now() where id=p_message_id;
  return jsonb_build_object('ok',true,'message_id',p_message_id,'edited_at',now());
end;
$function$;
revoke all on function public.vtg_edit_message(uuid,text) from public, anon;
grant execute on function public.vtg_edit_message(uuid,text) to authenticated;

alter table public.trade_orders add column if not exists closed_at timestamptz,
  add column if not exists delivery_confirmed_by uuid references auth.users(id) on delete set null;

create or replace function public.vtg_confirm_order_delivery(p_order_id uuid)
returns jsonb language plpgsql security invoker set search_path = ''
as $function$
declare v_user uuid:=auth.uid(); v_order public.trade_orders%rowtype;
begin
  if v_user is null then raise exception 'Sign in before confirming delivery' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_user and p.role='buyer'::public.vtg_account_role and p.is_active=true and p.account_environment='trade') then
    raise exception 'An active buyer trade account is required' using errcode='42501';
  end if;
  select * into v_order from public.trade_orders where id=p_order_id and buyer_id=v_user for update;
  if not found then raise exception 'This trade deal is not available to your account' using errcode='42501'; end if;
  if v_order.closed_at is not null then return jsonb_build_object('ok',true,'already_closed',true,'closed_at',v_order.closed_at); end if;
  if not exists(select 1 from public.trade_order_milestones m where m.order_id=v_order.id and m.milestone='delivered' and m.created_by=v_order.supplier_id) then
    raise exception 'The supplier must first record the goods as delivered. You can then confirm receipt and close the deal.';
  end if;
  update public.trade_orders set status='delivered'::public.vtg_order_status,closed_at=now(),delivery_confirmed_by=v_user,updated_at=now() where id=v_order.id;
  return jsonb_build_object('ok',true,'already_closed',false,'closed_at',now());
end;
$function$;
revoke all on function public.vtg_confirm_order_delivery(uuid) from public, anon;
grant execute on function public.vtg_confirm_order_delivery(uuid) to authenticated;
