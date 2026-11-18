alter table public.vtg_trade_posts drop constraint if exists vtg_trade_posts_body_check;
alter table public.vtg_trade_posts add constraint vtg_trade_posts_body_check check (char_length(btrim(body)) >= 1 and char_length(btrim(body)) <= 5000);
alter table public.vtg_trade_posts drop constraint if exists vtg_trade_posts_post_type_check;
alter table public.vtg_trade_posts add constraint vtg_trade_posts_post_type_check check (post_type in ('update','question','insight','product','advert','news','announcement','trade_tip','video'));
