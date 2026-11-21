-- VTG marketplace pipeline: supplier lists a product -> VTG reviews it -> buyers see it.
--
-- * public.products gets a review state (pending / approved / rejected) that suppliers can read but never write.
-- * Only approved + active products are visible to other users; suppliers always see their own.
-- * If a supplier changes a live listing's commercial details it goes back to review (no bait-and-switch).
-- * Staff review through vtg_review_product(); the review queue is vtg_admin_product_queue().
-- * public.vtg_marketplace_products is the buyer/public catalogue (the table the buyer dashboard, cart,
--   landed-cost and marketplace page already read). It exposes only approved listings and safe supplier details.
-- Safe to re-run.

alter table public.products
  add column if not exists review_status text not null default 'pending',
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

alter table public.products drop constraint if exists products_review_status_check;
alter table public.products add constraint products_review_status_check check (review_status in ('pending','approved','rejected'));

-- anything already verified stays approved
update public.products set review_status = 'approved' where is_verified and review_status = 'pending';

create index if not exists products_review_status_created_idx on public.products (review_status, created_at desc);
create index if not exists products_reviewed_by_idx on public.products (reviewed_by);

-- suppliers can read the outcome of the review (never write it: no INSERT/UPDATE grant on these columns)
grant select (review_status, review_note, reviewed_at) on public.products to authenticated;

-- visibility: approved and active listings to everyone signed in; a supplier always sees their own; staff see all
drop policy if exists "active products visible" on public.products;
drop policy if exists "approved products visible" on public.products;
create policy "approved products visible" on public.products
  for select to authenticated
  using (
    (is_active = true and is_verified = true and review_status = 'approved')
    or supplier_id = (select auth.uid())
    or private.vtg_is_admin()
  );

-- a supplier's change to commercial details sends the listing back to review
create or replace function private.vtg_products_review_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- server-side / staff writes are trusted
  if auth.uid() is null or private.vtg_is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.review_status := 'pending';
    new.is_verified := false;
    new.review_note := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
    return new;
  end if;
  if (new.name, new.category, new.description, new.unit_price, new.currency, new.minimum_order_quantity,
      new.hs_code, new.lead_time_days, new.origin_country, new.image_urls)
     is distinct from
     (old.name, old.category, old.description, old.unit_price, old.currency, old.minimum_order_quantity,
      old.hs_code, old.lead_time_days, old.origin_country, old.image_urls) then
    new.review_status := 'pending';
    new.is_verified := false;
    new.review_note := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
  else
    -- nothing commercial changed: review fields can never be altered by the supplier
    new.review_status := old.review_status;
    new.is_verified := old.is_verified;
    new.review_note := old.review_note;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
  end if;
  return new;
end;
$$;

drop trigger if exists vtg_products_review_guard on public.products;
create trigger vtg_products_review_guard
  before insert or update on public.products
  for each row execute function private.vtg_products_review_guard();

-- staff decision
create or replace function public.vtg_review_product(p_product_id uuid, p_decision text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_uid is null or not private.vtg_is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'Decision must be approved or rejected' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and v_note is null then
    raise exception 'Please give the supplier a reason when rejecting a product' using errcode = '22023';
  end if;
  update public.products
     set review_status = p_decision,
         is_verified = (p_decision = 'approved'),
         review_note = v_note,
         reviewed_at = now(),
         reviewed_by = v_uid
   where id = p_product_id;
  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.vtg_review_product(uuid, text, text) from public, anon;
grant execute on function public.vtg_review_product(uuid, text, text) to authenticated;

-- staff review queue (with supplier details the staff need to judge a listing)
create or replace function public.vtg_admin_product_queue(p_status text default 'pending')
returns table (
  id uuid, supplier_id uuid, supplier_name text, supplier_email text, supplier_country text,
  supplier_verification text, name text, category text, description text, unit_price numeric,
  currency text, minimum_order_quantity integer, hs_code text, lead_time_days integer,
  origin_country text, image_urls text[], is_active boolean, review_status text, review_note text,
  reviewed_at timestamptz, created_at timestamptz, updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.vtg_is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if p_status not in ('pending','approved','rejected','all') then
    raise exception 'Unknown status' using errcode = '22023';
  end if;
  return query
    select p.id, p.supplier_id,
           coalesce(sp.company_name, pr.full_name), pr.email, coalesce(sp.country, pr.country),
           sp.verification_status::text,
           p.name, p.category, p.description, p.unit_price, p.currency, p.minimum_order_quantity,
           p.hs_code, p.lead_time_days, p.origin_country, p.image_urls, p.is_active,
           p.review_status, p.review_note, p.reviewed_at, p.created_at, p.updated_at
      from public.products p
      join public.profiles pr on pr.id = p.supplier_id
      left join public.supplier_profiles sp on sp.user_id = p.supplier_id
     where p_status = 'all' or p.review_status = p_status
     order by p.created_at desc
     limit 300;
end;
$$;
revoke all on function public.vtg_admin_product_queue(text) from public, anon;
grant execute on function public.vtg_admin_product_queue(text) to authenticated;

-- buyer / public catalogue (replaces the earlier view, which showed every active product of a verified supplier
-- with is_verified hard-coded to true). Same columns, same order; now only approved listings are returned.
-- Runs as its owner on purpose so visitors can see a supplier's company name, country, logo and rating without
-- being able to read supplier_profiles.
-- an older view with a different column order may exist (create or replace cannot reorder); it has no dependents
drop view if exists public.vtg_marketplace_products;
create view public.vtg_marketplace_products
with (security_invoker = false) as
select
  p.id, p.supplier_id, p.name, p.category, p.description, p.unit_price, p.currency,
  p.minimum_order_quantity, p.hs_code, p.lead_time_days, p.origin_country, p.image_urls, p.created_at,
  coalesce(nullif(sp.company_name, ''), 'Verified supplier') as supplier_name,
  sp.country as supplier_country,
  sp.logo_url as supplier_logo_url,
  sp.rating as supplier_rating,
  true as is_verified
from public.products p
join public.supplier_profiles sp on sp.user_id = p.supplier_id and sp.verification_status = 'verified'
where p.is_active and p.is_verified and p.review_status = 'approved';

revoke all on public.vtg_marketplace_products from public;
grant select on public.vtg_marketplace_products to anon, authenticated;
comment on view public.vtg_marketplace_products is 'Approved marketplace listings from verified suppliers (buyer and public catalogue).';
