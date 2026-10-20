create table public.study_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  minutes int not null check (minutes between 1 and 240),
  ended_at timestamptz not null default now()
);
create index on public.study_sessions (user_id, ended_at desc);

alter table public.study_sessions enable row level security;
create policy "own study sessions read" on public.study_sessions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own study sessions insert" on public.study_sessions for insert to authenticated
  with check (user_id = (select auth.uid()));
revoke update, delete on public.study_sessions from authenticated, anon;
