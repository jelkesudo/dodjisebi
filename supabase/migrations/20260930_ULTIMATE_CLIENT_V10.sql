begin;

-- ============================================================
-- DOĐI SEBI — ULTIMATE CLIENT V10
-- Safe additive client schema + application→account flow.
-- Existing staff portal tables stay intact.
-- ============================================================

create extension if not exists pgcrypto;

-- APPLICATION → AUTH USER LINK
alter table public.applications add column if not exists user_id uuid null references auth.users(id) on delete set null;
create index if not exists applications_user_id_idx on public.applications(user_id);

-- CLIENT PROFILE
create table if not exists public.client_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_profiles_first_name_len check (char_length(first_name) <= 80),
  constraint client_profiles_last_name_len check (char_length(last_name) <= 80),
  constraint client_profiles_phone_len check (phone is null or char_length(phone) <= 40)
);

-- One-time server-side authorization for creating a client Auth user.
create table if not exists public.pending_client_invites (
  email text primary key,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  application_id uuid null references public.applications(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now()
);
revoke all on public.pending_client_invites from public, anon, authenticated;

-- CATALOG
create table if not exists public.offerings (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('membership','webinar','program','individual_service')),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) between 1 and 200),
  short_description text null check (short_description is null or char_length(short_description) <= 1000),
  description text null check (description is null or char_length(description) <= 20000),
  active boolean not null default true,
  purchasable boolean not null default true,
  access_days integer null check (access_days is null or access_days between 1 and 3650),
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offerings_dates check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.offering_prices (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings(id) on delete cascade,
  currency text not null default 'RSD' check (currency ~ '^[A-Z]{3}$'),
  amount integer not null check (amount >= 0),
  billing_interval text null check (billing_interval in ('one_time','month','quarter','year')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists one_active_price_per_offering on public.offering_prices(offering_id) where active;
create index if not exists offering_prices_offering_idx on public.offering_prices(offering_id);

-- PROMOTIONS
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(trim(code)) and char_length(code) between 3 and 64),
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value integer not null check (discount_value >= 0),
  valid_from timestamptz null,
  valid_until timestamptz null,
  redemption_from timestamptz null,
  redemption_until timestamptz null,
  max_redemptions integer null check (max_redemptions is null or max_redemptions > 0),
  max_redemptions_per_user integer null check (max_redemptions_per_user is null or max_redemptions_per_user > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint promo_percent_range check (discount_type <> 'percent' or discount_value between 0 and 10000),
  constraint promo_valid_dates check (valid_until is null or valid_from is null or valid_until > valid_from),
  constraint promo_redeem_dates check (redemption_until is null or redemption_from is null or redemption_until > redemption_from)
);

create table if not exists public.promo_code_offerings (
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  offering_id uuid not null references public.offerings(id) on delete cascade,
  primary key (promo_code_id, offering_id)
);

create table if not exists public.promo_eligible_users (
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (promo_code_id, user_id)
);

-- ORDERS / PAYMENT
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('DS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','awaiting_payment','paid','completed','cancelled','refunded','failed')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  subtotal_amount integer not null check (subtotal_amount >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  total_amount integer not null check (total_amount >= 0),
  promo_code_id uuid null references public.promo_codes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_math check (total_amount = subtotal_amount - discount_amount)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  offering_id uuid not null references public.offerings(id) on delete restrict,
  title_snapshot text not null,
  unit_amount integer not null check (unit_amount >= 0),
  quantity integer not null default 1 check (quantity = 1),
  line_total integer not null check (line_total >= 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text null,
  status text not null default 'pending' check (status in ('pending','authorized','paid','failed','cancelled','refunded')),
  amount integer not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_payment_id)
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  redeemed_at timestamptz not null default now()
);

-- ACCESS / SUBSCRIPTIONS
create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offering_id uuid not null references public.offerings(id) on delete cascade,
  source_order_id uuid null references public.orders(id) on delete set null,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint access_grants_dates check (ends_at is null or ends_at > starts_at)
);

create unique index if not exists access_grants_order_offering_unique
  on public.access_grants(source_order_id, offering_id) where source_order_id is not null;

create table if not exists public.client_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offering_id uuid not null references public.offerings(id) on delete restrict,
  provider text null,
  provider_subscription_id text null,
  status text not null default 'active' check (status in ('trialing','active','past_due','cancelled','expired')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_subscription_id)
);

create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists promo_redemptions_user_idx on public.promo_redemptions(user_id, promo_code_id);
create index if not exists access_grants_user_idx on public.access_grants(user_id, status);
create index if not exists client_subscriptions_user_idx on public.client_subscriptions(user_id, status);

-- UPDATED_AT helper
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- CLIENT/STAFF AUTH USER ROUTING.
-- Existing staff allowlist remains authoritative for staff accounts.
-- Client users are created only by service-role with account_type=client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed public.allowed_emails%rowtype;
  v_account_type text := coalesce(new.raw_user_meta_data->>'account_type','');
begin
  select * into v_allowed
  from public.allowed_emails
  where lower(email) = lower(new.email)
  limit 1;

  if found then
    insert into public.profiles(id, full_name, role, avatar_url)
    values (
      new.id,
      coalesce(nullif(v_allowed.full_name,''), nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
      v_allowed.role,
      new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do update set
      full_name = excluded.full_name,
      role = excluded.role,
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
    return new;
  end if;

  if v_account_type = 'client' and exists (
    select 1 from public.pending_client_invites
    where lower(email)=lower(new.email) and expires_at > now()
  ) then
    insert into public.client_profiles(user_id, first_name, last_name)
    select new.id, first_name, last_name
    from public.pending_client_invites
    where lower(email)=lower(new.email) and expires_at > now()
    order by created_at desc limit 1
    on conflict (user_id) do nothing;

    delete from public.pending_client_invites where lower(email)=lower(new.email);
    return new;
  end if;

  raise exception 'Email is not authorized to create this account';
end;
$$;

-- Ensure exactly one auth.users insert trigger calls the routing function.
do $$
declare r record;
begin
  for r in
    select tgname
    from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and not tgisinternal
      and pg_get_triggerdef(oid) ilike '%handle_new_user%'
  loop
    execute format('drop trigger if exists %I on auth.users', r.tgname);
  end loop;
end $$;
create trigger on_auth_user_created_dodji_sebi
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Server-only lookup so public callers can never enumerate Auth users.
create or replace function public.get_auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1
$$;
revoke all on function public.get_auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.get_auth_user_id_by_email(text) to service_role;

create or replace function public.link_application_to_user(p_application_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.applications set user_id = p_user_id where id = p_application_id;
end $$;
revoke all on function public.link_application_to_user(uuid,uuid) from public, anon, authenticated;
grant execute on function public.link_application_to_user(uuid,uuid) to service_role;

-- Secure application creator V2 returns the created application id.
create or replace function public.create_application_secure_v2(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_message text,
  p_ip_key text,
  p_email_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application_id uuid;
  v_cooldown_acquired boolean := false;
begin
  if p_ip_key is null or p_email_hash is null
     or char_length(p_ip_key) <> 64 or char_length(p_email_hash) <> 64
     or p_ip_key !~ '^[0-9a-f]{64}$' or p_email_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status','invalid');
  end if;

  if p_first_name is null or p_last_name is null or p_email is null
     or char_length(p_first_name) not between 1 and 80
     or char_length(p_last_name) not between 1 and 80
     or char_length(p_email) not between 3 and 254
     or (p_message is not null and char_length(p_message) > 2000) then
    return jsonb_build_object('status','invalid');
  end if;

  if not public.check_application_rate_limit(p_ip_key) then
    return jsonb_build_object('status','rate_limited');
  end if;

  insert into public.application_email_cooldowns(email_hash, expires_at)
  values (p_email_hash, now() + interval '24 hours')
  on conflict (email_hash) do update
    set expires_at = excluded.expires_at
    where public.application_email_cooldowns.expires_at <= now();

  v_cooldown_acquired := found;
  if not v_cooldown_acquired then
    return jsonb_build_object('status','duplicate');
  end if;

  insert into public.applications(first_name,last_name,email,message)
  values (p_first_name,p_last_name,p_email,nullif(p_message,''))
  returning id into v_application_id;

  return jsonb_build_object('status','created','application_id',v_application_id);
exception
  when check_violation or not_null_violation then
    return jsonb_build_object('status','invalid');
end;
$$;
revoke all on function public.create_application_secure_v2(text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_application_secure_v2(text,text,text,text,text,text) to service_role;

-- Quote calculation. Percent is stored in basis points: 10000 = 100%.
create or replace function public.quote_offering_for_user(p_user_id uuid, p_offering_id uuid, p_promo_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offering public.offerings%rowtype;
  v_price public.offering_prices%rowtype;
  v_promo public.promo_codes%rowtype;
  v_discount integer := 0;
  v_global_count integer := 0;
  v_user_count integer := 0;
  v_restricted_count integer := 0;
  v_eligible_count integer := 0;
begin
  select * into v_offering from public.offerings where id=p_offering_id and active and purchasable;
  if not found then raise exception 'offering_not_found'; end if;
  select * into v_price from public.offering_prices where offering_id=p_offering_id and active limit 1;
  if not found then raise exception 'price_not_found'; end if;

  if p_promo_code is not null and trim(p_promo_code) <> '' then
    select * into v_promo from public.promo_codes where code=upper(trim(p_promo_code)) and active;
    if not found then raise exception 'promo_invalid'; end if;
    if v_promo.valid_from is not null and now() < v_promo.valid_from then raise exception 'promo_invalid'; end if;
    if v_promo.valid_until is not null and now() >= v_promo.valid_until then raise exception 'promo_invalid'; end if;
    if v_promo.redemption_from is not null and now() < v_promo.redemption_from then raise exception 'promo_invalid'; end if;
    if v_promo.redemption_until is not null and now() >= v_promo.redemption_until then raise exception 'promo_invalid'; end if;

    select count(*) into v_restricted_count from public.promo_code_offerings where promo_code_id=v_promo.id;
    if v_restricted_count > 0 and not exists(select 1 from public.promo_code_offerings where promo_code_id=v_promo.id and offering_id=p_offering_id) then raise exception 'promo_invalid'; end if;

    select count(*) into v_eligible_count from public.promo_eligible_users where promo_code_id=v_promo.id;
    if v_eligible_count > 0 and not exists(select 1 from public.promo_eligible_users where promo_code_id=v_promo.id and user_id=p_user_id) then raise exception 'promo_invalid'; end if;

    select count(*) into v_global_count from public.promo_redemptions where promo_code_id=v_promo.id;
    select count(*) into v_user_count from public.promo_redemptions where promo_code_id=v_promo.id and user_id=p_user_id;
    if v_promo.max_redemptions is not null and v_global_count >= v_promo.max_redemptions then raise exception 'promo_exhausted'; end if;
    if v_promo.max_redemptions_per_user is not null and v_user_count >= v_promo.max_redemptions_per_user then raise exception 'promo_exhausted'; end if;

    if v_promo.discount_type='percent' then
      v_discount := floor(v_price.amount * v_promo.discount_value / 10000.0)::integer;
    else
      v_discount := least(v_price.amount, v_promo.discount_value);
    end if;
  end if;

  return jsonb_build_object(
    'offering_id',v_offering.id,'title',v_offering.title,'type',v_offering.type,
    'currency',v_price.currency,'subtotal_amount',v_price.amount,'discount_amount',v_discount,
    'total_amount',v_price.amount-v_discount,'promo_code_id',v_promo.id,'billing_interval',v_price.billing_interval
  );
end;
$$;
revoke all on function public.quote_offering_for_user(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.quote_offering_for_user(uuid,uuid,text) to service_role;

create or replace function public.create_client_order(p_user_id uuid, p_offering_id uuid, p_promo_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  q jsonb;
  v_order public.orders%rowtype;
  v_access_end timestamptz;
  v_access_days integer;
begin
  q := public.quote_offering_for_user(p_user_id,p_offering_id,p_promo_code);
  insert into public.orders(user_id,status,currency,subtotal_amount,discount_amount,total_amount,promo_code_id)
  values (p_user_id, case when (q->>'total_amount')::integer=0 then 'completed' else 'awaiting_payment' end,
          q->>'currency',(q->>'subtotal_amount')::integer,(q->>'discount_amount')::integer,(q->>'total_amount')::integer,
          nullif(q->>'promo_code_id','')::uuid)
  returning * into v_order;

  insert into public.order_items(order_id,offering_id,title_snapshot,unit_amount,line_total)
  values(v_order.id,p_offering_id,q->>'title',(q->>'subtotal_amount')::integer,(q->>'subtotal_amount')::integer);

  if v_order.promo_code_id is not null then
    insert into public.promo_redemptions(promo_code_id,user_id,order_id) values(v_order.promo_code_id,p_user_id,v_order.id);
  end if;

  if v_order.total_amount=0 then
    select access_days into v_access_days from public.offerings where id=p_offering_id;
    v_access_end := case when v_access_days is null then null else now() + make_interval(days=>v_access_days) end;
    insert into public.access_grants(user_id,offering_id,source_order_id,ends_at)
    values(p_user_id,p_offering_id,v_order.id,v_access_end)
    on conflict do nothing;
  end if;

  return to_jsonb(v_order);
end;
$$;
revoke all on function public.create_client_order(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.create_client_order(uuid,uuid,text) to service_role;

-- RLS
alter table public.client_profiles enable row level security;
alter table public.offerings enable row level security;
alter table public.offering_prices enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_code_offerings enable row level security;
alter table public.promo_eligible_users enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.access_grants enable row level security;
alter table public.client_subscriptions enable row level security;

-- Replace client policies deterministically.
drop policy if exists client_profile_own_read on public.client_profiles;
create policy client_profile_own_read on public.client_profiles for select to authenticated using(user_id=auth.uid());
drop policy if exists client_profile_own_update on public.client_profiles;
create policy client_profile_own_update on public.client_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists public_active_offerings on public.offerings;
create policy public_active_offerings on public.offerings for select to anon,authenticated using(active=true);
drop policy if exists public_active_prices on public.offering_prices;
create policy public_active_prices on public.offering_prices for select to anon,authenticated using(active=true and exists(select 1 from public.offerings o where o.id=offering_id and o.active));

drop policy if exists own_orders_read on public.orders;
create policy own_orders_read on public.orders for select to authenticated using(user_id=auth.uid());
drop policy if exists own_order_items_read on public.order_items;
create policy own_order_items_read on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
drop policy if exists own_payments_read on public.payments;
create policy own_payments_read on public.payments for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
drop policy if exists own_access_read on public.access_grants;
create policy own_access_read on public.access_grants for select to authenticated using(user_id=auth.uid());
drop policy if exists own_subscriptions_read on public.client_subscriptions;
create policy own_subscriptions_read on public.client_subscriptions for select to authenticated using(user_id=auth.uid());

revoke all on public.client_profiles,public.offerings,public.offering_prices,public.promo_codes,public.promo_code_offerings,public.promo_eligible_users,public.orders,public.order_items,public.payments,public.promo_redemptions,public.access_grants,public.client_subscriptions from anon,authenticated;
grant select on public.offerings,public.offering_prices to anon,authenticated;
grant select on public.client_profiles,public.orders,public.order_items,public.payments,public.access_grants,public.client_subscriptions to authenticated;
grant update(first_name,last_name,phone) on public.client_profiles to authenticated;

-- Keep sensitive application domain server-only.
revoke all on public.applications,public.application_rate_limits,public.application_email_cooldowns,public.application_email_outbox,public.pending_client_invites from anon,authenticated;

commit;
