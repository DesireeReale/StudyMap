alter table public.flashcards
  add column ease real not null default 2.5 check (ease between 1.3 and 3.0),
  add column interval_days int not null default 0 check (interval_days between 0 and 3650),
  add column repetitions int not null default 0 check (repetitions >= 0),
  add column due_at timestamptz not null default now();
create index on public.flashcards (user_id, due_at);
