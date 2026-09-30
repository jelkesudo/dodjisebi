-- DOĐI SEBI V10: rate limiting for custom Resend password-recovery emails
create table if not exists public.password_reset_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0,
  constraint password_reset_rate_limits_key_hash check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint password_reset_rate_limits_attempts check (attempts >= 0)
);

-- Compatibility: an earlier manual hotfix used request_count instead of attempts.
alter table public.password_reset_rate_limits
  add column if not exists attempts integer;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='password_reset_rate_limits' and column_name='request_count'
  ) then
    execute 'update public.password_reset_rate_limits set attempts = coalesce(attempts, request_count, 0)';
  else
    update public.password_reset_rate_limits set attempts = coalesce(attempts, 0);
  end if;
end $$;

alter table public.password_reset_rate_limits
  alter column attempts set default 0,
  alter column attempts set not null;

alter table public.password_reset_rate_limits enable row level security;
revoke all on table public.password_reset_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.password_reset_rate_limits to service_role;

create or replace function public.check_password_reset_rate_limit(p_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
  v_started timestamptz;
begin
  if p_key is null or char_length(p_key) <> 64 or p_key !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  insert into public.password_reset_rate_limits(key_hash, window_started_at, attempts)
  values (p_key, now(), 1)
  on conflict (key_hash) do update
  set window_started_at = case
        when public.password_reset_rate_limits.window_started_at <= now() - interval '15 minutes' then now()
        else public.password_reset_rate_limits.window_started_at
      end,
      attempts = case
        when public.password_reset_rate_limits.window_started_at <= now() - interval '15 minutes' then 1
        else public.password_reset_rate_limits.attempts + 1
      end
  returning attempts, window_started_at into v_attempts, v_started;

  return v_attempts <= 5;
end;
$$;

revoke all on function public.check_password_reset_rate_limit(text) from public, anon, authenticated;
grant execute on function public.check_password_reset_rate_limit(text) to service_role;

create index if not exists password_reset_rate_limits_window_idx
  on public.password_reset_rate_limits(window_started_at);
