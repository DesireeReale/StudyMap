create table public.feature_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('idea', 'problema', 'altro')),
  message text not null check (char_length(message) between 10 and 2000),
  page text check (char_length(page) <= 200),
  created_at timestamptz not null default now()
);
create index on public.feature_requests (created_at desc);

alter table public.feature_requests enable row level security;

create policy "own request insert" on public.feature_requests for insert to authenticated
  with check (user_id = (select auth.uid()));
revoke select, update, delete on public.feature_requests from authenticated, anon;
