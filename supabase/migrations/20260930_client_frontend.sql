-- Client-facing domain. Keeps staff portal roles separate from client entitlements.
create table if not exists public.client_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 first_name text not null default '' check(char_length(first_name)<=80),
 last_name text not null default '' check(char_length(last_name)<=80),
 phone text check(phone is null or char_length(phone)<=40),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.offerings (
 id uuid primary key default gen_random_uuid(), type text not null check(type in('membership','webinar','program','individual_service')),
 slug text not null unique check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'), title text not null check(char_length(trim(title)) between 1 and 200),
 short_description text, description text, active boolean not null default true, purchasable boolean not null default true,
 access_days integer check(access_days is null or access_days between 1 and 3650), starts_at timestamptz, ends_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.offering_prices (
 id uuid primary key default gen_random_uuid(), offering_id uuid not null references public.offerings(id) on delete cascade,
 currency text not null default 'RSD' check(currency ~ '^[A-Z]{3}$'), amount integer not null check(amount>=0), billing_interval text check(billing_interval in('one_time','month','quarter','year')),
 active boolean not null default true, created_at timestamptz not null default now()
);
create unique index if not exists one_active_price_per_offering on public.offering_prices(offering_id) where active;
create table if not exists public.promo_codes (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code=upper(trim(code)) and char_length(code) between 3 and 64),
 discount_type text not null check(discount_type in('percent','fixed')), discount_value integer not null check(discount_value>=0),
 valid_from timestamptz, valid_until timestamptz, redemption_from timestamptz, redemption_until timestamptz,
 max_redemptions integer check(max_redemptions is null or max_redemptions>0), max_redemptions_per_user integer check(max_redemptions_per_user is null or max_redemptions_per_user>0),
 active boolean not null default true, created_at timestamptz not null default now(),
 check(discount_type<>'percent' or discount_value between 0 and 10000)
);
create table if not exists public.promo_code_offerings (promo_code_id uuid references public.promo_codes(id) on delete cascade, offering_id uuid references public.offerings(id) on delete cascade, primary key(promo_code_id,offering_id));
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(), order_number text not null unique default ('DS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 user_id uuid not null references auth.users(id) on delete restrict, status text not null default 'pending' check(status in('pending','awaiting_payment','paid','completed','cancelled','refunded','failed')),
 currency text not null check(currency ~ '^[A-Z]{3}$'), subtotal_amount integer not null check(subtotal_amount>=0), discount_amount integer not null default 0 check(discount_amount>=0), total_amount integer not null check(total_amount>=0),
 promo_code_id uuid references public.promo_codes(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(total_amount=subtotal_amount-discount_amount)
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, offering_id uuid not null references public.offerings(id) on delete restrict,
 title_snapshot text not null, unit_amount integer not null check(unit_amount>=0), quantity integer not null default 1 check(quantity=1), line_total integer not null check(line_total>=0)
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, provider text not null, provider_payment_id text,
 status text not null default 'pending' check(status in('pending','authorized','paid','failed','cancelled','refunded')),
 amount integer not null check(amount>=0), currency text not null check(currency ~ '^[A-Z]{3}$'), metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(provider,provider_payment_id)
);
create table if not exists public.promo_redemptions (
 id uuid primary key default gen_random_uuid(), promo_code_id uuid not null references public.promo_codes(id) on delete restrict, user_id uuid not null references auth.users(id) on delete restrict,
 order_id uuid not null unique references public.orders(id) on delete cascade, redeemed_at timestamptz not null default now()
);
create table if not exists public.access_grants (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, offering_id uuid not null references public.offerings(id) on delete cascade,
 source_order_id uuid references public.orders(id) on delete set null, status text not null default 'active' check(status in('active','expired','revoked')),
 starts_at timestamptz not null default now(), ends_at timestamptz, created_at timestamptz not null default now(), check(ends_at is null or ends_at>starts_at)
);
create table if not exists public.client_subscriptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, offering_id uuid not null references public.offerings(id) on delete restrict,
 provider text, provider_subscription_id text, status text not null default 'active' check(status in('trialing','active','past_due','cancelled','expired')),
 current_period_start timestamptz not null default now(), current_period_end timestamptz, cancel_at_period_end boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(provider,provider_subscription_id)
);
create index if not exists orders_user_created_idx on public.orders(user_id,created_at desc);
create index if not exists access_grants_user_idx on public.access_grants(user_id,status);
create index if not exists client_subscriptions_user_idx on public.client_subscriptions(user_id,status);
create index if not exists promo_redemptions_user_idx on public.promo_redemptions(user_id,promo_code_id);

alter table public.client_profiles enable row level security; alter table public.offerings enable row level security; alter table public.offering_prices enable row level security;
alter table public.promo_codes enable row level security; alter table public.promo_code_offerings enable row level security; alter table public.orders enable row level security;
alter table public.order_items enable row level security; alter table public.payments enable row level security; alter table public.promo_redemptions enable row level security;
alter table public.access_grants enable row level security; alter table public.client_subscriptions enable row level security;

drop policy if exists client_profile_own_read on public.client_profiles; create policy client_profile_own_read on public.client_profiles for select to authenticated using(user_id=auth.uid());
drop policy if exists client_profile_own_update on public.client_profiles; create policy client_profile_own_update on public.client_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists public_active_offerings on public.offerings; create policy public_active_offerings on public.offerings for select to anon,authenticated using(active=true);
drop policy if exists public_active_prices on public.offering_prices; create policy public_active_prices on public.offering_prices for select to anon,authenticated using(active=true and exists(select 1 from public.offerings o where o.id=offering_id and o.active));
drop policy if exists own_orders_read on public.orders; create policy own_orders_read on public.orders for select to authenticated using(user_id=auth.uid());
drop policy if exists own_order_items_read on public.order_items; create policy own_order_items_read on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
drop policy if exists own_payments_read on public.payments; create policy own_payments_read on public.payments for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
drop policy if exists own_access_read on public.access_grants; create policy own_access_read on public.access_grants for select to authenticated using(user_id=auth.uid());
drop policy if exists own_subscriptions_read on public.client_subscriptions; create policy own_subscriptions_read on public.client_subscriptions for select to authenticated using(user_id=auth.uid());

revoke insert,update,delete on public.offerings,public.offering_prices,public.promo_codes,public.promo_code_offerings,public.orders,public.order_items,public.payments,public.promo_redemptions,public.access_grants,public.client_subscriptions from anon,authenticated;
grant select on public.offerings,public.offering_prices to anon,authenticated;
grant select on public.client_profiles,public.orders,public.order_items,public.payments,public.access_grants,public.client_subscriptions to authenticated;
grant update(first_name,last_name,phone) on public.client_profiles to authenticated;

create or replace function public.ensure_client_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.client_profiles(user_id,first_name,last_name) values(new.id,coalesce(new.raw_user_meta_data->>'first_name',''),coalesce(new.raw_user_meta_data->>'last_name','')) on conflict(user_id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_create_client_profile on auth.users;
create trigger on_auth_user_create_client_profile after insert on auth.users for each row execute function public.ensure_client_profile();

create or replace function public.quote_offering_for_user(p_user_id uuid,p_offering_id uuid,p_promo_code text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.offering_prices%rowtype; c public.promo_codes%rowtype; d integer:=0; global_count integer; user_count integer;
begin
 if p_user_id is null or p_offering_id is null then raise exception 'invalid'; end if;
 select op.* into p from public.offering_prices op join public.offerings o on o.id=op.offering_id where op.offering_id=p_offering_id and op.active and o.active and o.purchasable limit 1;
 if not found then raise exception 'not_available'; end if;
 if p_promo_code is not null and trim(p_promo_code)<>'' then
   select * into c from public.promo_codes where code=upper(trim(p_promo_code)) and active;
   if not found or (c.valid_from is not null and now()<c.valid_from) or (c.valid_until is not null and now()>c.valid_until) or (c.redemption_from is not null and now()<c.redemption_from) or (c.redemption_until is not null and now()>c.redemption_until) then raise exception 'promo_invalid'; end if;
   if exists(select 1 from public.promo_code_offerings where promo_code_id=c.id) and not exists(select 1 from public.promo_code_offerings where promo_code_id=c.id and offering_id=p_offering_id) then raise exception 'promo_invalid'; end if;
   select count(*) into global_count from public.promo_redemptions where promo_code_id=c.id; select count(*) into user_count from public.promo_redemptions where promo_code_id=c.id and user_id=p_user_id;
   if c.max_redemptions is not null and global_count>=c.max_redemptions then raise exception 'promo_exhausted'; end if;
   if c.max_redemptions_per_user is not null and user_count>=c.max_redemptions_per_user then raise exception 'promo_exhausted'; end if;
   d:=case when c.discount_type='percent' then floor(p.amount*c.discount_value/10000.0)::integer else least(p.amount,c.discount_value) end;
 end if;
 return jsonb_build_object('offering_id',p_offering_id,'price_id',p.id,'currency',p.currency,'subtotal_amount',p.amount,'discount_amount',d,'total_amount',p.amount-d,'promo_code_id',c.id,'billing_interval',p.billing_interval);
end $$;
revoke all on function public.quote_offering_for_user(uuid,uuid,text) from public,anon,authenticated; grant execute on function public.quote_offering_for_user(uuid,uuid,text) to service_role;

create or replace function public.create_client_order(p_user_id uuid,p_offering_id uuid,p_promo_code text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare q jsonb; oid uuid; ttl text; access_days integer; total integer; promo uuid;
begin
 q:=public.quote_offering_for_user(p_user_id,p_offering_id,p_promo_code); total:=(q->>'total_amount')::integer; promo:=nullif(q->>'promo_code_id','')::uuid;
 select title,o.access_days into ttl,access_days from public.offerings o where id=p_offering_id for update;
 insert into public.orders(user_id,status,currency,subtotal_amount,discount_amount,total_amount,promo_code_id) values(p_user_id,case when total=0 then 'completed' else 'awaiting_payment' end,q->>'currency',(q->>'subtotal_amount')::integer,(q->>'discount_amount')::integer,total,promo) returning id into oid;
 insert into public.order_items(order_id,offering_id,title_snapshot,unit_amount,line_total) values(oid,p_offering_id,ttl,(q->>'subtotal_amount')::integer,total);
 if total=0 then
   if promo is not null then insert into public.promo_redemptions(promo_code_id,user_id,order_id) values(promo,p_user_id,oid); end if;
   insert into public.access_grants(user_id,offering_id,source_order_id,ends_at) values(p_user_id,p_offering_id,oid,case when access_days is null then null else now()+make_interval(days=>access_days) end);
 end if;
 return jsonb_build_object('id',oid,'status',case when total=0 then 'completed' else 'awaiting_payment' end,'currency',q->>'currency','subtotal_amount',(q->>'subtotal_amount')::integer,'discount_amount',(q->>'discount_amount')::integer,'total_amount',total);
end $$;
revoke all on function public.create_client_order(uuid,uuid,text) from public,anon,authenticated; grant execute on function public.create_client_order(uuid,uuid,text) to service_role;
