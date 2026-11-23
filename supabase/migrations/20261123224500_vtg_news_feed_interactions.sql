create table if not exists public.vtg_news_interactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 target_key text not null, article_url text not null,
 interaction_type text not null check (interaction_type in ('like','comment','follow_source')), body text, created_at timestamptz not null default now(),
 constraint vtg_news_interaction_body_check check ((interaction_type='comment' and body is not null and length(trim(body)) between 1 and 2000) or (interaction_type<>'comment' and body is null))
);
create index if not exists vtg_news_interactions_target_idx on public.vtg_news_interactions(target_key,interaction_type,created_at);
create unique index if not exists vtg_news_interactions_unique_action on public.vtg_news_interactions(user_id,target_key,interaction_type) where interaction_type in ('like','follow_source');
alter table public.vtg_news_interactions enable row level security;
drop policy if exists vtg_news_interactions_public_read on public.vtg_news_interactions;
create policy vtg_news_interactions_public_read on public.vtg_news_interactions for select to anon,authenticated using (true);
revoke all on public.vtg_news_interactions from anon,authenticated;
grant select on public.vtg_news_interactions to anon,authenticated;
create or replace function public.vtg_news_interaction(p_article_url text,p_target_key text,p_interaction_type text,p_body text default null)
returns jsonb language plpgsql security definer set search_path=public,private,auth as $$
declare v_uid uuid:=auth.uid(); v_profile public.profiles%rowtype; v_existing uuid; v_count integer; v_warning integer:=0; v_category text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_profile from public.profiles where id=v_uid;
 if not found or v_profile.is_active is distinct from true or (v_profile.role<>'admin' and v_profile.account_environment<>'trade') then raise exception 'ACTIVE_ACCOUNT_REQUIRED'; end if;
 if p_article_url !~ '^https?://' or length(p_article_url)>1800 then raise exception 'INVALID_ARTICLE_URL'; end if;
 if p_interaction_type not in ('like','comment','follow_source') then raise exception 'INVALID_INTERACTION'; end if;
 if p_target_key is null or length(p_target_key)>300 then raise exception 'INVALID_TARGET'; end if;
 if p_interaction_type='comment' then
  if p_body is null or length(trim(p_body)) not between 1 and 2000 then raise exception 'INVALID_COMMENT'; end if;
  v_category:=private.vtg_message_content_violation(p_body);
  if v_category is not null then
   insert into private.vtg_message_moderation_events(user_id,category,created_at) values(v_uid,v_category,now());
   select count(*) into v_warning from private.vtg_message_moderation_events where user_id=v_uid and created_at>now()-interval '30 days';
   return jsonb_build_object('ok',false,'warning_count',v_warning,'message','This comment was blocked because it violates VTG community standards.');
  end if;
  insert into public.vtg_news_interactions(user_id,target_key,article_url,interaction_type,body) values(v_uid,p_target_key,p_article_url,'comment',trim(p_body));
  select count(*) into v_count from public.vtg_news_interactions where target_key=p_target_key and interaction_type='comment';
  return jsonb_build_object('ok',true,'comment_count',v_count);
 end if;
 select id into v_existing from public.vtg_news_interactions where user_id=v_uid and target_key=p_target_key and interaction_type=p_interaction_type limit 1;
 if v_existing is not null then
  delete from public.vtg_news_interactions where id=v_existing;
  select count(*) into v_count from public.vtg_news_interactions where target_key=p_target_key and interaction_type=p_interaction_type;
  return jsonb_build_object('ok',true,'active',false,'count',v_count);
 end if;
 insert into public.vtg_news_interactions(user_id,target_key,article_url,interaction_type) values(v_uid,p_target_key,p_article_url,p_interaction_type);
 select count(*) into v_count from public.vtg_news_interactions where target_key=p_target_key and interaction_type=p_interaction_type;
 return jsonb_build_object('ok',true,'active',true,'count',v_count);
end $$;
revoke all on function public.vtg_news_interaction(text,text,text,text) from public,anon;
grant execute on function public.vtg_news_interaction(text,text,text,text) to authenticated;