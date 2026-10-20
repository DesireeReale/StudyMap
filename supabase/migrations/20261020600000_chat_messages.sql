create table public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  document_id uuid references public.documents (id) on delete cascade,
  note_id uuid references public.notes (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  pages int[] not null default '{}' check (cardinality(pages) <= 20),
  created_at timestamptz not null default now(),
  check ((document_id is null) <> (note_id is null))
);
create index on public.chat_messages (document_id, created_at) where document_id is not null;
create index on public.chat_messages (note_id, created_at) where note_id is not null;

alter table public.chat_messages enable row level security;

create policy "own chat read" on public.chat_messages for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own chat insert" on public.chat_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      exists (select 1 from public.documents d where d.id = document_id and d.user_id = (select auth.uid()))
      or exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
    )
  );
create policy "own chat delete" on public.chat_messages for delete to authenticated
  using (user_id = (select auth.uid()));
revoke update on public.chat_messages from authenticated, anon;
