-- Public Trade Feed is read-only for visitors. RLS policies still restrict
-- rows to published posts, their public media/comments/reactions, and active
-- trade-account author labels. These grants allow the anon-key Edge Function
-- to read only the data permitted by those policies.
grant select on table
  public.profiles,
  public.vtg_trade_posts,
  public.vtg_trade_post_media,
  public.vtg_trade_post_comments,
  public.vtg_trade_post_reactions
to anon;
