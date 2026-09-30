-- Public application hardening required by submit-application.
create table if not exists public.application_email_cooldowns (
  email_hash text primary key,
  expires_at timestamptz not null
);
create table if not exists public.application_email_outbox (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  email_type text not null check (email_type in ('admin_notification','user_confirmation')),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  next_attempt_at timestamptz not null default now(),
  provider_message_id text check (provider_message_id is null or char_length(provider_message_id)<=500),
  last_error text check (last_error is null or char_length(last_error)<=4000),
  created_at timestamptz not null default now(), sent_at timestamptz,
  unique(application_id,email_type)
);
alter table public.application_email_cooldowns enable row level security;
alter table public.application_email_outbox enable row level security;
revoke all on public.applications, public.application_rate_limits, public.application_email_cooldowns, public.application_email_outbox from anon, authenticated;
create index if not exists application_email_cooldowns_expires_idx on public.application_email_cooldowns(expires_at);
create index if not exists application_email_outbox_pending_idx on public.application_email_outbox(next_attempt_at,created_at) where status in ('pending','failed');

create or replace function public.create_application_secure(p_first_name text,p_last_name text,p_email text,p_message text,p_ip_key text,p_email_hash text)
returns text language plpgsql security definer set search_path='' as $$
declare v_application_id uuid; v_cooldown_acquired boolean:=false;
begin
 if p_ip_key is null or p_email_hash is null or char_length(p_ip_key)<>64 or char_length(p_email_hash)<>64 or p_ip_key !~ '^[0-9a-f]{64}$' or p_email_hash !~ '^[0-9a-f]{64}$' then return 'invalid'; end if;
 if p_first_name is null or p_last_name is null or p_email is null then return 'invalid'; end if;
 if char_length(p_first_name) not between 1 and 80 or char_length(p_last_name) not between 1 and 80 or char_length(p_email) not between 3 and 254 or (p_message is not null and char_length(p_message)>2000) then return 'invalid'; end if;
 if not public.check_application_rate_limit(p_ip_key) then return 'rate_limited'; end if;
 insert into public.application_email_cooldowns(email_hash,expires_at) values(p_email_hash,now()+interval '24 hours')
 on conflict(email_hash) do update set expires_at=excluded.expires_at where public.application_email_cooldowns.expires_at<=now();
 v_cooldown_acquired:=found; if not v_cooldown_acquired then return 'duplicate'; end if;
 insert into public.applications(first_name,last_name,email,message) values(trim(p_first_name),trim(p_last_name),lower(trim(p_email)),nullif(trim(p_message),'')) returning id into v_application_id;
 insert into public.application_email_outbox(application_id,email_type) values(v_application_id,'admin_notification'),(v_application_id,'user_confirmation');
 return 'created';
exception when check_violation or not_null_violation then return 'invalid';
end $$;
revoke all on function public.create_application_secure(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_application_secure(text,text,text,text,text,text) to service_role;
