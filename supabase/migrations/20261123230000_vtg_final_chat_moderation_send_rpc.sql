drop function if exists public.vtg_send_message(uuid,text);
create function public.vtg_send_message(p_conversation_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path = public, private, pg_temp
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
revoke all on function public.vtg_send_message(uuid,text) from public,anon;
grant execute on function public.vtg_send_message(uuid,text) to authenticated;
