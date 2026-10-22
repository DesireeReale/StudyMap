-- Plans granted by the owner after a manual payment. profiles.plan is kept only as a legacy column:
-- the app reads the active plan from subscriptions.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product text not null default 'studymap',
  plan text not null check (plan in ('pro', 'promax')),
  starts_at date not null default current_date,
  ends_at date,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null
);

create index on public.subscriptions (user_id, product);

alter table public.subscriptions enable row level security;
create policy "own subscriptions" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.subscriptions from authenticated, anon;

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on public.admins from authenticated, anon;

insert into public.subscriptions (user_id, plan, note)
select id, 'pro', 'migrated from profiles.plan' from public.profiles where plan = 'pro';

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create function public.admin_user_overview(p_email text, p_month text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    return null;
  end if;
  return jsonb_build_object(
    'id', v_user,
    'email', (select email from auth.users where id = v_user),
    'generations', coalesce((select count from public.quota_counters
      where user_id = v_user and kind = 'generation' and period = p_month), 0),
    'cost_usd', coalesce((select sum(cost_usd) from public.ai_usage
      where user_id = v_user and to_char(created_at at time zone 'UTC', 'YYYY-MM') = p_month), 0),
    'subscriptions', coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc)
      from public.subscriptions s where s.user_id = v_user), '[]'::jsonb)
  );
end;
$$;

create function public.admin_grant_plan(p_user uuid, p_plan text, p_ends_at date, p_note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.subscriptions (user_id, plan, ends_at, note, created_by)
  values (p_user, p_plan, p_ends_at, nullif(trim(p_note), ''), (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.admin_revoke_subscription(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.subscriptions set revoked_at = now(), revoked_by = (select auth.uid())
  where id = p_id and revoked_at is null;
end;
$$;

revoke execute on function public.is_admin(), public.admin_user_overview(text, text),
  public.admin_grant_plan(uuid, text, date, text), public.admin_revoke_subscription(uuid) from public, anon;
grant execute on function public.is_admin(), public.admin_user_overview(text, text),
  public.admin_grant_plan(uuid, text, date, text), public.admin_revoke_subscription(uuid) to authenticated;
