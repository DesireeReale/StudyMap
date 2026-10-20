create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  folder_id uuid not null default public.default_folder_id(),
  document_id uuid references public.documents (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  created_at timestamptz not null default now(),
  foreign key (folder_id, user_id) references public.folders (id, user_id)
);
create index on public.quizzes (folder_id, created_at desc);

create table public.quiz_attempts (
  id bigint generated always as identity primary key,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  score int not null check (score >= 0),
  total int not null check (total > 0 and score <= total),
  created_at timestamptz not null default now()
);
create index on public.quiz_attempts (quiz_id, created_at desc);

alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;

create policy "own quizzes" on public.quizzes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own quiz attempts read" on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own quiz attempts insert" on public.quiz_attempts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.user_id = (select auth.uid()))
  );
revoke update, delete on public.quiz_attempts from authenticated, anon;

create or replace function public.move_document(p_document uuid, p_folder uuid) returns void
language sql set search_path = '' as $$
  update public.documents set folder_id = p_folder where id = p_document;
  update public.maps set folder_id = p_folder where document_id = p_document;
  update public.decks set folder_id = p_folder where document_id = p_document;
  update public.quizzes set folder_id = p_folder where document_id = p_document;
$$;
