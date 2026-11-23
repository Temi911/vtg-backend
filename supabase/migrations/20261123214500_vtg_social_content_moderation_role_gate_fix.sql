create or replace function public.vtg_create_trade_post(
  p_body text,p_post_type text default 'update',p_region text default null,p_external_url text default null,p_country_code text default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid uuid:=auth.uid(); v_profile public.profiles%rowtype; v_body text:=btrim(coalesce(p_body,'')); v_type text:=lower(btrim(coalesce(p_post_type,'update')));
  v_region text:=nullif(btrim(coalesce(p_region,'')),''); v_url text:=nullif(btrim(coalesce(p_external_url,'')),''); v_country text:=nullif(btrim(coalesce(p_country_code,'')),'');
  v_category text; v_warnings integer; v_post public.vtg_trade_posts%rowtype;
begin
  if v_uid is null then raise exception 'Sign in to publish a trade update' using errcode='42501'; end if;
  select * into v_profile from public.profiles where id=v_uid;
  if not found or v_profile.is_active is distinct from true or (v_profile.account_environment is distinct from 'trade' and v_profile.role is distinct from 'admin'::public.vtg_account_role) then
    raise exception 'An active VTG trade account is required to publish' using errcode='42501';
  end if;
  if v_type not in ('update','product','advert','news','announcement','trade_tip','video') then raise exception 'Unsupported post type'; end if;
  if v_type in ('product','advert') and v_profile.role not in ('supplier'::public.vtg_account_role,'admin'::public.vtg_account_role) then raise exception 'Supplier adverts and product offers are reserved for supplier accounts' using errcode='42501'; end if;
  if v_type='announcement' and v_profile.role not in ('supplier'::public.vtg_account_role,'bank'::public.vtg_account_role,'admin'::public.vtg_account_role) then raise exception 'Announcements are reserved for organisation accounts' using errcode='42501'; end if;
  if length(v_body)>2000 then raise exception 'Trade posts must be 2000 characters or fewer'; end if;
  if v_body='' and v_url is null then raise exception 'A post needs text, a link or photos'; end if;
  if v_url is not null and v_url !~* '^https?://' then raise exception 'Only HTTP or HTTPS links are allowed'; end if;
  if v_region is not null and v_region not in ('Africa','China','South Korea') then raise exception 'Choose Africa, China or South Korea as the trade region'; end if;
  v_category:=private.vtg_message_content_violation(v_body);
  if v_category is not null then
    insert into private.vtg_trade_content_moderation_events(user_id,context_type,category) values(v_uid,'trade_post',v_category);
    select count(*)::integer into v_warnings from private.vtg_trade_content_moderation_events where user_id=v_uid and created_at>=now()-interval '30 days';
    return jsonb_build_object('ok',false,'violation',true,'category',v_category,'warning_count',v_warnings,'message','Your post was not published. VTG does not allow sexually explicit, abusive, or threatening content. Please rewrite it respectfully.');
  end if;
  insert into public.vtg_trade_posts(author_id,body,post_type,external_url,country_code,region,is_published)
  values(v_uid,coalesce(nullif(v_body,''),'Shared media'),v_type,v_url,left(v_country,80),v_region,true) returning * into v_post;
  return jsonb_build_object('ok',true,'post_id',v_post.id,'post',to_jsonb(v_post));
end;
$function$;
revoke all on function public.vtg_create_trade_post(text,text,text,text,text) from public,anon;
grant execute on function public.vtg_create_trade_post(text,text,text,text,text) to authenticated;
