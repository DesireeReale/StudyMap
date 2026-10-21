create table public.provider_usage (
  provider text not null,
  period text not null,
  count int not null default 0,
  primary key (provider, period)
);
alter table public.provider_usage enable row level security;

create function public.take_provider_slot(
  p_provider text, p_minute text, p_minute_limit int, p_day text, p_day_limit int default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  ok boolean;
begin
  if p_day_limit is not null then
    insert into public.provider_usage as u (provider, period, count)
    values (p_provider, p_day, 1)
    on conflict (provider, period) do update set count = u.count + 1 where u.count < p_day_limit
    returning true into ok;
    if not coalesce(ok, false) then
      return 'day';
    end if;
  end if;

  ok := null;
  insert into public.provider_usage as u (provider, period, count)
  values (p_provider, p_minute, 1)
  on conflict (provider, period) do update set count = u.count + 1 where u.count < p_minute_limit
  returning true into ok;
  if not coalesce(ok, false) then
    if p_day_limit is not null then
      update public.provider_usage set count = count - 1 where provider = p_provider and period = p_day;
    end if;
    return 'minute';
  end if;

  delete from public.provider_usage where provider = p_provider and period < p_minute and period like 'm:%';
  return 'ok';
end;
$$;

revoke execute on function public.take_provider_slot from public, anon, authenticated;
grant execute on function public.take_provider_slot to service_role;

alter table public.ai_jobs drop constraint ai_jobs_phase_check;
alter table public.ai_jobs add constraint ai_jobs_phase_check
  check (phase in ('queued', 'read', 'transcribe', 'generate', 'merge', 'wait', 'done', 'error'));
