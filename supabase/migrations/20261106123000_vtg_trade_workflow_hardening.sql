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
