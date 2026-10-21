alter table public.ai_usage
  add column duration_ms int check (duration_ms >= 0),
  add column queue_wait_ms int not null default 0 check (queue_wait_ms >= 0),
  add column outcome text check (outcome in ('ok', 'invalid', 'timeout', 'rate_limited', 'error'));
create index on public.ai_usage (created_at desc);

alter table public.ai_jobs add column duration_ms int check (duration_ms >= 0);

create view public.ai_latency_stats with (security_invoker = true) as
select
  model,
  task,
  count(*) as calls,
  percentile_cont(0.5) within group (order by duration_ms) as median_ms,
  percentile_cont(0.95) within group (order by duration_ms) as p95_ms,
  round(avg(queue_wait_ms)) as avg_queue_wait_ms,
  round(100.0 * count(*) filter (where not ok) / count(*), 1) as error_pct,
  round(100.0 * count(*) filter (where outcome = 'timeout') / count(*), 1) as timeout_pct,
  round(100.0 * count(*) filter (where outcome = 'rate_limited') / count(*), 1) as rate_limited_pct
from public.ai_usage
where created_at > now() - interval '7 days' and provider <> 'mock'
group by model, task
order by task, median_ms;

revoke all on public.ai_latency_stats from anon, authenticated;
