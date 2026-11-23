alter table public.vtg_trade_posts add column if not exists region text;
do $$
begin
  if not exists(select 1 from pg_constraint where conrelid='public.vtg_trade_posts'::regclass and conname='vtg_trade_posts_region_check') then
    alter table public.vtg_trade_posts add constraint vtg_trade_posts_region_check
      check(region is null or region in ('Africa','China','South Korea'));
  end if;
end $$;
update public.vtg_trade_posts
set region=case
  when upper(coalesce(country_code,'')) in ('CN') or lower(coalesce(country_code,'')) in ('china','chinese') then 'China'
  when upper(coalesce(country_code,'')) in ('KR') or lower(coalesce(country_code,'')) in ('south korea','korea','republic of korea') then 'South Korea'
  when upper(coalesce(country_code,'')) in ('DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW')
    or lower(coalesce(country_code,'')) in ('algeria','angola','benin','botswana','burkina faso','burundi','cabo verde','cameroon','central african republic','chad','comoros','congo','democratic republic of the congo','ivory coast','cote d''ivoire','djibouti','egypt','equatorial guinea','eritrea','eswatini','ethiopia','gabon','gambia','ghana','guinea','guinea-bissau','kenya','lesotho','liberia','libya','madagascar','malawi','mali','mauritania','mauritius','morocco','mozambique','namibia','niger','nigeria','rwanda','sao tome and principe','senegal','seychelles','sierra leone','somalia','south africa','south sudan','sudan','tanzania','togo','tunisia','uganda','zambia','zimbabwe')
    then 'Africa'
  else null
end
where region is null and country_code is not null;
create index if not exists vtg_trade_posts_region_created_idx
  on public.vtg_trade_posts(region,created_at desc) where is_published=true;
