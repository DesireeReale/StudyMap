-- Paginated overview of every user for /admin. Replaces the single-user lookup.

drop function public.admin_user_overview(text, text);

create function public.admin_users_page(
  p_today date,
  p_month text,
  p_filter text default 'all',
  p_email text default '',
  p_sort text default 'created_at',
  p_desc boolean default true,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order text;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v_order := case p_sort
    when 'email' then 'email'
    when 'plan' then 'plan_rank'
    when 'ends_at' then 'ends_at'
    when 'generations' then 'generations'
    when 'documents' then 'documents'
    when 'cost' then 'cost_usd'
    when 'last_active' then 'last_active'
    else 'created_at'
  end;

  execute format($q$
    with month as (
      select (($2 || '-01')::timestamp at time zone 'UTC') as starts,
             (($2 || '-01')::timestamp at time zone 'UTC') + interval '1 month' as ends
    ),
    users as (
      select
        u.id,
        u.email::text as email,
        u.created_at,
        a.id as active_id,
        coalesce(a.plan, 'free') as plan,
        case a.plan when 'promax' then 2 when 'pro' then 1 else 0 end as plan_rank,
        a.ends_at,
        (select s.note from public.subscriptions s
          where s.user_id = u.id and s.product = 'studymap' order by s.created_at desc limit 1) as last_note,
        (select max(s.ends_at) from public.subscriptions s
          where s.user_id = u.id and s.product = 'studymap' and s.revoked_at is null and s.ends_at < $1) as last_expired,
        coalesce((select q.count from public.quota_counters q
          where q.user_id = u.id and q.kind = 'generation' and q.period = $2), 0) as generations,
        (select count(*) from public.documents d where d.user_id = u.id) as documents,
        coalesce((select sum(x.cost_usd) from public.ai_usage x, month m
          where x.user_id = u.id and x.created_at >= m.starts and x.created_at < m.ends), 0) as cost_usd,
        greatest(
          u.last_sign_in_at,
          (select max(x.created_at) from public.ai_usage x where x.user_id = u.id),
          (select max(d.created_at) from public.documents d where d.user_id = u.id)
        ) as last_active
      from auth.users u
      left join lateral (
        select s.id, s.plan, s.ends_at from public.subscriptions s
        where s.user_id = u.id and s.product = 'studymap' and s.revoked_at is null
          and s.starts_at <= $1 and coalesce(s.ends_at, 'infinity'::date) >= $1
        order by case s.plan when 'promax' then 2 else 1 end desc, coalesce(s.ends_at, 'infinity'::date) desc
        limit 1
      ) a on true
    ),
    filtered as (
      select * from users
      where ($3 = '' or email ilike '%%' || $3 || '%%')
        and case $4
          when 'free' then plan = 'free'
          when 'pro' then plan <> 'free'
          when 'expiring' then ends_at between $1 and $1 + 7
          when 'expired' then plan = 'free' and last_expired >= $1 - 30
          else true
        end
    )
    select jsonb_build_object(
      'total_users', (select count(*) from users),
      'pro_users', (select count(*) from users where plan <> 'free'),
      'expiring', (select count(*) from users where ends_at between $1 and $1 + 7),
      'cost_month', (select coalesce(sum(cost_usd), 0) from users),
      'count', (select count(*) from filtered),
      'rows', coalesce((
        select jsonb_agg(to_jsonb(p) - 'rn' order by p.rn)
        from (
          select f.*, row_number() over (order by %I %s nulls last, f.id) as rn
          from filtered f order by rn limit $5 offset $6
        ) p
      ), '[]'::jsonb)
    )
  $q$, v_order, case when p_desc then 'desc' else 'asc' end)
  into v_result
  using p_today, p_month, coalesce(trim(p_email), ''), p_filter, least(greatest(p_limit, 1), 200), greatest(p_offset, 0);

  return v_result;
end;
$$;

revoke execute on function public.admin_users_page(date, text, text, text, text, boolean, int, int) from public, anon;
grant execute on function public.admin_users_page(date, text, text, text, text, boolean, int, int) to authenticated;
