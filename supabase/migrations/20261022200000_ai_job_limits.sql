alter table public.ai_jobs
  add column retryable boolean not null default true,
  add column upgrade boolean not null default false;
