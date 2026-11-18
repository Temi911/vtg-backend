-- Preserve the explicit optional signup consent in the private preference table.
create or replace function public.vtg_create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  requested_role text;
  buyer_type_value text;
  invite_id_text text;
  invite_role text;
  staff_invite boolean := false;
  marketing_opt_in boolean := false;
begin
  requested_role := new.raw_user_meta_data->>'requested_role';
  buyer_type_value := new.raw_user_meta_data->>'buyer_type';
  invite_id_text := new.raw_user_meta_data->>'workforce_invitation_id';
  invite_role := new.raw_user_meta_data->>'workforce_role';
  marketing_opt_in := lower(coalesce(new.raw_user_meta_data->>'marketing_subscribed','false')) = 'true';

  if invite_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    perform 1 from public.vtg_workforce_invitations i
    where i.id = invite_id_text::uuid and lower(i.email) = lower(new.email)
      and i.workspace_role = invite_role and i.status = 'pending' and i.expires_at > now();
    staff_invite := found;
  end if;

  insert into public.profiles
    (id,email,full_name,phone,preferred_language,country,city,role,account_environment)
  values (
    new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'phone',''),
    coalesce(nullif(new.raw_user_meta_data->>'preferred_language',''),'en'),
    nullif(new.raw_user_meta_data->>'country',''),nullif(new.raw_user_meta_data->>'city',''),
    case when staff_invite then 'agent'::public.vtg_account_role else 'buyer'::public.vtg_account_role end,
    case when staff_invite then 'staff' else 'trade' end
  )
  on conflict (id) do update set email = excluded.email;

  insert into public.vtg_email_preferences(user_id,marketing_subscribed)
  values (new.id,marketing_opt_in)
  on conflict (user_id) do nothing;

  if not staff_invite then
    insert into public.buyer_profiles(user_id,buyer_type,company_name,registration_no,state)
    values (
      new.id,
      case when buyer_type_value in ('individual','business','dealer','ngo') then buyer_type_value else 'business' end,
      nullif(new.raw_user_meta_data->>'company_name',''),
      nullif(new.raw_user_meta_data->>'registration_no',''),
      nullif(new.raw_user_meta_data->>'state','')
    ) on conflict (user_id) do nothing;

    if requested_role in ('supplier','bank')
       and nullif(trim(new.raw_user_meta_data->>'organization_name'),'') is not null then
      insert into public.role_requests(
        user_id,requested_role,organization_name,country,registration_reference,message,application_data
      ) values (
        new.id,requested_role::public.vtg_account_role,
        trim(new.raw_user_meta_data->>'organization_name'),
        nullif(new.raw_user_meta_data->>'country',''),
        nullif(new.raw_user_meta_data->>'registration_reference',''),
        nullif(new.raw_user_meta_data->>'role_request_message',''),
        coalesce(new.raw_user_meta_data,'{}'::jsonb)
      );
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.vtg_consume_email_preference_token(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_user_id uuid;
begin
  update public.vtg_email_preference_tokens
     set consumed_at = now()
   where token_hash = p_token_hash and consumed_at is null and expires_at > now()
   returning user_id into target_user_id;
  if target_user_id is null then return false; end if;

  insert into public.vtg_email_preferences(user_id,marketing_subscribed,updated_at)
  values (target_user_id,false,now())
  on conflict (user_id) do update
    set marketing_subscribed = false, updated_at = now();
  return true;
end;
$function$;

revoke all on function public.vtg_consume_email_preference_token(text) from public, anon, authenticated;
grant execute on function public.vtg_consume_email_preference_token(text) to service_role;
