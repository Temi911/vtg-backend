drop policy if exists "Active members can publish own trade posts" on public.vtg_trade_posts;
create policy "Active members can publish own trade posts"
on public.vtg_trade_posts for insert to authenticated
with check (
 author_id=auth.uid() and is_published=true
 and exists (
  select 1 from public.profiles p where p.id=auth.uid() and p.is_active=true
  and (
   (post_type in ('advert','product') and p.role in ('supplier','admin'))
   or (post_type='announcement' and p.role in ('supplier','bank','admin'))
   or post_type in ('update','news','trade_tip','video')
  )
 )
);
