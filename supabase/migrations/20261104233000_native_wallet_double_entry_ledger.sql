-- Native VTG wallet with atomic double-entry transfers. Wallet balances are funded only
-- by separately verified settlement/credit workflows; public clients cannot mint funds.
create table if not exists public.vtg_wallet_accounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 currency text not null check(currency in ('USD','NGN','CNY')), balance numeric(20,2) not null default 0 check(balance>=0),
 status text not null default 'active' check(status in ('active','frozen','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,currency)
);
create table if not exists public.vtg_wallet_transfers (
 id uuid primary key default gen_random_uuid(), sender_id uuid not null references public.profiles(id),
 recipient_id uuid not null references public.profiles(id), currency text not null check(currency in ('USD','NGN','CNY')),
 amount numeric(20,2) not null check(amount>0), note text, status text not null default 'completed' check(status in ('completed','reversed')),
 idempotency_key text not null, created_at timestamptz not null default now(), unique(sender_id,idempotency_key), check(sender_id<>recipient_id)
);
create table if not exists public.vtg_wallet_ledger (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.vtg_wallet_accounts(id),
 transfer_id uuid references public.vtg_wallet_transfers(id), entry_type text not null check(entry_type in ('credit','debit','adjustment')),
 amount numeric(20,2) not null check(amount>0), balance_after numeric(20,2) not null check(balance_after>=0),
 description text, created_at timestamptz not null default now()
);
create index if not exists vtg_wallet_ledger_account_created_idx on public.vtg_wallet_ledger(account_id,created_at desc);
create index if not exists vtg_wallet_transfers_recipient_idx on public.vtg_wallet_transfers(recipient_id,created_at desc);
alter table public.vtg_wallet_accounts enable row level security;
alter table public.vtg_wallet_transfers enable row level security;
alter table public.vtg_wallet_ledger enable row level security;
drop policy if exists "Users read own wallet accounts" on public.vtg_wallet_accounts;
create policy "Users read own wallet accounts" on public.vtg_wallet_accounts for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Users read own wallet transfers" on public.vtg_wallet_transfers;
create policy "Users read own wallet transfers" on public.vtg_wallet_transfers for select to authenticated using(sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));
drop policy if exists "Users read own wallet ledger" on public.vtg_wallet_ledger;
create policy "Users read own wallet ledger" on public.vtg_wallet_ledger for select to authenticated using(exists(select 1 from public.vtg_wallet_accounts a where a.id=account_id and a.user_id=(select auth.uid())));
revoke all on public.vtg_wallet_accounts,public.vtg_wallet_transfers,public.vtg_wallet_ledger from anon,authenticated;
grant select on public.vtg_wallet_accounts,public.vtg_wallet_transfers,public.vtg_wallet_ledger to authenticated;
create or replace function public.vtg_wallet_transfer(p_sender uuid,p_recipient uuid,p_currency text,p_amount numeric,p_note text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare sa public.vtg_wallet_accounts%rowtype; ra public.vtg_wallet_accounts%rowtype; t public.vtg_wallet_transfers%rowtype;
 sb numeric(20,2); rb numeric(20,2);
begin
 if p_sender=p_recipient then raise exception 'Cannot transfer to yourself'; end if;
 if p_currency not in ('USD','NGN','CNY') then raise exception 'Unsupported wallet currency'; end if;
 if p_amount is null or p_amount<=0 or round(p_amount,2)<>p_amount then raise exception 'Amount must be positive with at most two decimals'; end if;
 if length(coalesce(p_idempotency_key,''))<8 or length(p_idempotency_key)>120 then raise exception 'A valid idempotency key is required'; end if;
 if not exists(select 1 from public.profiles where id=p_sender and is_active=true) or not exists(select 1 from public.profiles where id=p_recipient and is_active=true) then raise exception 'Wallet user is inactive or unavailable'; end if;
 select * into t from public.vtg_wallet_transfers where sender_id=p_sender and idempotency_key=p_idempotency_key;
 if found then
  if t.recipient_id<>p_recipient or t.currency<>p_currency or t.amount<>p_amount then raise exception 'Idempotency key reused for a different transfer'; end if;
  return jsonb_build_object('transfer_id',t.id,'status',t.status,'reused',true);
 end if;
 insert into public.vtg_wallet_accounts(user_id,currency) values(p_sender,p_currency) on conflict(user_id,currency) do nothing;
 insert into public.vtg_wallet_accounts(user_id,currency) values(p_recipient,p_currency) on conflict(user_id,currency) do nothing;
 perform 1 from public.vtg_wallet_accounts where user_id in (p_sender,p_recipient) and currency=p_currency order by user_id for update;
 select * into sa from public.vtg_wallet_accounts where user_id=p_sender and currency=p_currency;
 select * into ra from public.vtg_wallet_accounts where user_id=p_recipient and currency=p_currency;
 if sa.status<>'active' or ra.status<>'active' then raise exception 'Wallet account is not active'; end if;
 if sa.balance<p_amount then raise exception 'Insufficient wallet balance'; end if;
 insert into public.vtg_wallet_transfers(sender_id,recipient_id,currency,amount,note,idempotency_key) values(p_sender,p_recipient,p_currency,p_amount,left(coalesce(p_note,''),500),p_idempotency_key) returning * into t;
 update public.vtg_wallet_accounts set balance=balance-p_amount,updated_at=now() where id=sa.id returning balance into sb;
 update public.vtg_wallet_accounts set balance=balance+p_amount,updated_at=now() where id=ra.id returning balance into rb;
 insert into public.vtg_wallet_ledger(account_id,transfer_id,entry_type,amount,balance_after,description)
 values(sa.id,t.id,'debit',p_amount,sb,'Transfer to VTG user'),(ra.id,t.id,'credit',p_amount,rb,'Transfer received from VTG user');
 return jsonb_build_object('transfer_id',t.id,'status',t.status,'sender_balance',sb,'recipient_balance',rb,'reused',false);
end $$;
revoke all on function public.vtg_wallet_transfer(uuid,uuid,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.vtg_wallet_transfer(uuid,uuid,text,numeric,text,text) to service_role;
