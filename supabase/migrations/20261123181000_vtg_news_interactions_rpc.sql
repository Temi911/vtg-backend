-- Like / comment / follow-source for external trade news cards. Writes go only through these functions.
create or replace function public.vtg_news_toggle(p_target_key text, p_article_url text, p_type text)
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); removed int;
begin
  if me is null then raise exception 'Sign in to react to trade news' using errcode = '42501'; end if;
  if p_type not in ('like','follow_source') then raise exception 'Unsupported interaction'; end if;
  if coalesce(length(p_target_key),0) not between 1 and 300 or coalesce(length(p_article_url),0) not between 1 and 1000 then
    raise exception 'Invalid news reference';
  end if;
  if not exists (select 1 from public.profiles where id = me and is_active = true) then
    raise exception 'Active VTG account required' using errcode = '42501';
  end if;
  delete from public.vtg_news_interactions where user_id = me and target_key = p_target_key and interaction_type = p_type;
  get diagnostics removed = row_count;
  if removed > 0 then return false; end if;
  insert into public.vtg_news_interactions(user_id, target_key, article_url, interaction_type)
  values (me, p_target_key, p_article_url, p_type)
  on conflict do nothing;
  return true;
end;
$$;

create or replace function public.vtg_news_comment(p_target_key text, p_article_url text, p_body text)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); new_id uuid; clean text := btrim(coalesce(p_body,''));
begin
  if me is null then raise exception 'Sign in to comment' using errcode = '42501'; end if;
  if length(clean) not between 1 and 1000 then raise exception 'Comments must be 1 to 1000 characters'; end if;
  if coalesce(length(p_target_key),0) not between 1 and 300 or coalesce(length(p_article_url),0) not between 1 and 1000 then
    raise exception 'Invalid news reference';
  end if;
  if not exists (select 1 from public.profiles where id = me and is_active = true) then
    raise exception 'Active VTG account required' using errcode = '42501';
  end if;
  if (select count(*) from public.vtg_news_interactions
      where user_id = me and interaction_type = 'comment' and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Please wait a moment before commenting again';
  end if;
  insert into public.vtg_news_interactions(user_id, target_key, article_url, interaction_type, body)
  values (me, p_target_key, p_article_url, 'comment', clean) returning id into new_id;
  return new_id;
end;
$$;

-- Counts, my own state and the latest comments (display name only) for a set of cards.
create or replace function public.vtg_news_summary(p_keys text[], p_source_keys text[] default '{}')
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'likes', coalesce((select jsonb_object_agg(target_key, n) from (
        select target_key, count(*) n from public.vtg_news_interactions
        where interaction_type='like' and target_key = any(p_keys) group by 1) x), '{}'::jsonb),
    'comment_counts', coalesce((select jsonb_object_agg(target_key, n) from (
        select target_key, count(*) n from public.vtg_news_interactions
        where interaction_type='comment' and target_key = any(p_keys) group by 1) x), '{}'::jsonb),
    'followers', coalesce((select jsonb_object_agg(target_key, n) from (
        select target_key, count(*) n from public.vtg_news_interactions
        where interaction_type='follow_source' and target_key = any(p_source_keys) group by 1) x), '{}'::jsonb),
    'mine', coalesce((select jsonb_agg(jsonb_build_object('key', target_key, 'type', interaction_type))
        from public.vtg_news_interactions
        where user_id = auth.uid() and interaction_type in ('like','follow_source')
          and (target_key = any(p_keys) or target_key = any(p_source_keys))), '[]'::jsonb)
  );
$$;

create or replace function public.vtg_news_comments(p_target_key text)
returns table(id uuid, body text, created_at timestamptz, author text, mine boolean)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select i.id, i.body, i.created_at,
         coalesce(nullif(split_part(p.full_name,' ',1),''),'VTG member') as author,
         (i.user_id = auth.uid()) as mine
  from public.vtg_news_interactions i left join public.profiles p on p.id = i.user_id
  where i.interaction_type = 'comment' and i.target_key = p_target_key
  order by i.created_at desc limit 30;
$$;

revoke all on function public.vtg_news_toggle(text,text,text), public.vtg_news_comment(text,text,text),
  public.vtg_news_summary(text[],text[]), public.vtg_news_comments(text) from public, anon;
grant execute on function public.vtg_news_toggle(text,text,text), public.vtg_news_comment(text,text,text),
  public.vtg_news_summary(text[],text[]), public.vtg_news_comments(text) to authenticated;
