alter table public.ai_usage
  add column reasoning_tokens int not null default 0 check (reasoning_tokens >= 0);
