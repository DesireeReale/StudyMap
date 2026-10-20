create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('mindmap', 'flashcards', 'summary', 'quiz')),
  document_id uuid references public.documents (id) on delete cascade,
  note_id uuid references public.notes (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  href text,
  error text check (char_length(error) <= 500),
  quota_period text not null,
  quiz_period text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((document_id is null) <> (note_id is null))
);
create index on public.ai_jobs (user_id, created_at desc);

alter table public.ai_jobs enable row level security;

create policy "own jobs read" on public.ai_jobs for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.ai_jobs from authenticated, anon;
