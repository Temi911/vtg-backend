-- Harden supplier storefront trust and make inspection-payment confirmation atomic.
-- Applied only when this PR is released; no live database changes are made by this commit.

create or replace function public.vtg_guard_supplier_verification_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  if auth.uid() is not null and not private.vtg_is_admin() then
    if tg_op = 'INSERT' then
      new.verification_status := 'pending';
      new.verified_at := null;
      new.rating := 0;
      new.company_id := null;
    else
      new.verification_status := old.verification_status;
      new.verified_at := old.verified_at;
      new.rating := old.rating;
      new.company_id := old.company_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists vtg_guard_supplier_verification_fields on public.supplier_profiles;
create trigger vtg_guard_supplier_verification_fields
before insert or update on public.supplier_profiles
for each row execute function public.vtg_guard_supplier_verification_fields();

create or replace function public.vtg_guard_bank_verification_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  if auth.uid() is not null and not private.vtg_is_admin() then
    if tg_op = 'INSERT' then
      new.verification_status := 'pending';
      new.verified_at := null;
      new.company_id := null;
    else
      new.verification_status := old.verification_status;
      new.verified_at := old.verified_at;
      new.company_id := old.company_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists vtg_guard_bank_verification_fields on public.bank_profiles;
create trigger vtg_guard_bank_verification_fields
before insert or update on public.bank_profiles
for each row execute function public.vtg_guard_bank_verification_fields();

-- A bank can read only trade documents attached to an LC explicitly assigned to that bank.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trade_documents'
      and policyname = 'assigned lc banks read trade documents'
  ) then
    create policy "assigned lc banks read trade documents"
      on public.trade_documents
      for select to authenticated
      using (
        exists (
          select 1 from public.letters_of_credit lc
          where lc.order_id = trade_documents.order_id
            and lc.bank_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'assigned lc banks read private trade document objects'
  ) then
    create policy "assigned lc banks read private trade document objects"
      on storage.objects
      for select to authenticated
      using (
        bucket_id = 'vtg-trade-documents'
        and exists (
          select 1
          from public.trade_documents d
          join public.letters_of_credit lc on lc.order_id = d.order_id
          where d.storage_path = objects.name
            and lc.bank_id = (select auth.uid())
        )
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trade_quotes'
      and policyname = 'active buyers create quote requests for own orders'
  ) then
    create policy "active buyers create quote requests for own orders"
      on public.trade_quotes
      for insert to authenticated
      with check (
        buyer_id = (select auth.uid())
        and status = 'requested'
        and exists (
          select 1 from public.profiles p
          where p.id = (select auth.uid())
            and p.role = 'buyer'::public.vtg_account_role
            and p.is_active = true
        )
        and exists (
          select 1 from public.trade_orders o
          where o.id = trade_quotes.order_id
            and o.buyer_id = (select auth.uid())
            and o.supplier_id = trade_quotes.supplier_id
        )
      );
  end if;
end;
$$;

create or replace function public.vtg_confirm_inspection_payment(
  p_payment_id uuid,
  p_provider_reference text,
  p_amount_ngn numeric,
  p_paid_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment_row public.vtg_inspection_payments%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role required';
  end if;

  select * into payment_row
  from public.vtg_inspection_payments
  where id = p_payment_id
    and provider = 'paystack'
    and provider_reference = p_provider_reference
  for update;

  if not found then
    raise exception 'inspection payment reference not found';
  end if;

  if payment_row.status = 'paid' then
    return true;
  end if;

  if payment_row.currency <> 'NGN'
     or payment_row.amount_ngn is null
     or abs(payment_row.amount_ngn - p_amount_ngn) > 0.01 then
    raise exception 'verified amount does not match VTG payment record';
  end if;

  update public.vtg_inspection_payments
  set status = 'paid',
      provider_status = 'success',
      paid_at = coalesce(p_paid_at, now()),
      updated_at = now()
  where id = payment_row.id
    and status <> 'paid';

  update public.vtg_inspection_requests
  set payment_status = 'paid',
      updated_at = now()
  where id = payment_row.inspection_id
    and requested_by = payment_row.buyer_id;

  return true;
end;
$$;

revoke all on function public.vtg_confirm_inspection_payment(uuid, text, numeric, timestamptz) from public, anon, authenticated;
grant execute on function public.vtg_confirm_inspection_payment(uuid, text, numeric, timestamptz) to service_role;

-- Trade files must never be exposed through a public bucket URL.
UPDATE storage.buckets SET public = false WHERE id = 'vtg-trade-documents';


-- Bank workspace access is limited to trade records explicitly assigned through an LC.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trade_orders' and policyname='assigned lc banks read linked orders') then
    create policy "assigned lc banks read linked orders" on public.trade_orders
      for select to authenticated
      using (exists (select 1 from public.letters_of_credit lc where lc.order_id=trade_orders.id and lc.bank_id=(select auth.uid())));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='shipments' and policyname='assigned lc banks read linked shipments') then
    create policy "assigned lc banks read linked shipments" on public.shipments
      for select to authenticated
      using (exists (select 1 from public.letters_of_credit lc where lc.order_id=shipments.order_id and lc.bank_id=(select auth.uid())));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='shipment_events' and policyname='assigned lc banks read linked shipment events') then
    create policy "assigned lc banks read linked shipment events" on public.shipment_events
      for select to authenticated
      using (exists (
        select 1 from public.shipments s
        join public.letters_of_credit lc on lc.order_id=s.order_id
        where s.id=shipment_events.shipment_id and lc.bank_id=(select auth.uid())
      ));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='vtg_payment_intents' and policyname='assigned lc banks read linked payment intents') then
    create policy "assigned lc banks read linked payment intents" on public.vtg_payment_intents
      for select to authenticated
      using (exists (select 1 from public.letters_of_credit lc where lc.order_id=vtg_payment_intents.order_id and lc.bank_id=(select auth.uid())));
  end if;
end;
$$;

-- An assigned but unverified bank must not be able to update an LC.
drop policy if exists "bank or admin updates lc" on public.letters_of_credit;
create policy "verified assigned bank or admin updates lc"
  on public.letters_of_credit
  for update to authenticated
  using (
    private.vtg_is_admin()
    or (
      bank_id=(select auth.uid())
      and exists (
        select 1 from public.profiles p
        join public.bank_profiles bp on bp.user_id=p.id
        where p.id=(select auth.uid())
          and p.role='bank'::public.vtg_account_role
          and p.account_environment='trade'
          and p.is_active=true
          and bp.verification_status='verified'::public.vtg_document_status
      )
    )
  )
  with check (
    private.vtg_is_admin()
    or (
      bank_id=(select auth.uid())
      and exists (
        select 1 from public.profiles p
        join public.bank_profiles bp on bp.user_id=p.id
        where p.id=(select auth.uid())
          and p.role='bank'::public.vtg_account_role
          and p.account_environment='trade'
          and p.is_active=true
          and bp.verification_status='verified'::public.vtg_document_status
      )
    )
  );

create table if not exists public.vtg_bank_lc_review_events (
  id uuid primary key default gen_random_uuid(),
  lc_id uuid not null references public.letters_of_credit(id) on delete cascade,
  bank_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('under_review','documents_requested','declined')),
  note text,
  created_at timestamptz not null default now()
);
alter table public.vtg_bank_lc_review_events enable row level security;
revoke all on public.vtg_bank_lc_review_events from anon;
grant select, insert on public.vtg_bank_lc_review_events to authenticated;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='vtg_bank_lc_review_events' and policyname='assigned bank reads its lc review events') then
    create policy "assigned bank reads its lc review events" on public.vtg_bank_lc_review_events
      for select to authenticated
      using (bank_id=(select auth.uid()) and exists (
        select 1 from public.letters_of_credit lc where lc.id=lc_id and lc.bank_id=(select auth.uid())
      ));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='vtg_bank_lc_review_events' and policyname='verified bank records assigned lc review events') then
    create policy "verified bank records assigned lc review events" on public.vtg_bank_lc_review_events
      for insert to authenticated
      with check (
        bank_id=(select auth.uid()) and actor_id=(select auth.uid())
        and exists (
          select 1 from public.letters_of_credit lc
          join public.bank_profiles bp on bp.user_id=lc.bank_id
          join public.profiles p on p.id=lc.bank_id
          where lc.id=lc_id and lc.bank_id=(select auth.uid())
            and bp.verification_status='verified'::public.vtg_document_status
            and p.role='bank'::public.vtg_account_role
            and p.account_environment='trade' and p.is_active=true
        )
      );
  end if;
end;
$$;


create or replace function public.vtg_bank_review_lc(
  p_lc_id uuid,
  p_status text,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  updated_lc uuid;
begin
  if actor is null or p_status not in ('under_review','documents_requested','declined') then
    raise exception 'A verified assigned bank and supported review status are required';
  end if;

  perform set_config('vtg.bank_lc_review_note', left(coalesce(p_note,''),1000), true);

  update public.letters_of_credit lc
  set status = p_status, updated_at = now()
  where lc.id = p_lc_id
    and lc.bank_id = actor
    and exists (
      select 1
      from public.profiles p
      join public.bank_profiles bp on bp.user_id=p.id
      where p.id=actor
        and p.role='bank'::public.vtg_account_role
        and p.account_environment='trade'
        and p.is_active=true
        and bp.verification_status='verified'::public.vtg_document_status
    )
  returning lc.id into updated_lc;

  if updated_lc is null then
    raise exception 'LC is not assigned to this verified bank';
  end if;

  return updated_lc;
end;
$$;
revoke all on function public.vtg_bank_review_lc(uuid,text,text) from public, anon;
grant execute on function public.vtg_bank_review_lc(uuid,text,text) to authenticated;


-- A bank may only change its assigned LC review status; all other LC fields stay immutable.
create or replace function public.vtg_guard_bank_lc_update()
returns trigger
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare review_note text;
begin
  if auth.uid() is not null and not private.vtg_is_admin() then
    if old.bank_id is distinct from auth.uid()
       or new.id is distinct from old.id
       or new.order_id is distinct from old.order_id
       or new.buyer_id is distinct from old.buyer_id
       or new.supplier_id is distinct from old.supplier_id
       or new.bank_id is distinct from old.bank_id
       or new.reference is distinct from old.reference
       or new.amount is distinct from old.amount
       or new.currency is distinct from old.currency
       or new.expiry_date is distinct from old.expiry_date
       or new.created_at is distinct from old.created_at then
      raise exception 'Banks may not change LC parties, terms, value or assignment';
    end if;
    if new.status not in ('under_review','documents_requested','declined') then
      raise exception 'Unsupported bank LC review status';
    end if;
    new.updated_at := now();
    review_note := current_setting('vtg.bank_lc_review_note', true);
    insert into public.vtg_bank_lc_review_events(lc_id,bank_id,actor_id,status,note)
    values(old.id,auth.uid(),auth.uid(),new.status,nullif(review_note,''));
  end if;
  return new;
end;
$$;
drop trigger if exists vtg_guard_bank_lc_update on public.letters_of_credit;
create trigger vtg_guard_bank_lc_update
before update on public.letters_of_credit
for each row execute function public.vtg_guard_bank_lc_update();
