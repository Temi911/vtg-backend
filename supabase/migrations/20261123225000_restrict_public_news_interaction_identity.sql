revoke all on table public.vtg_news_interactions from public,anon,authenticated;
grant select (id,target_key,article_url,interaction_type,body,created_at) on public.vtg_news_interactions to anon,authenticated;
grant select (user_id) on public.vtg_news_interactions to authenticated;