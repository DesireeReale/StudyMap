create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  parent_id uuid,
  name text not null check (char_length(name) between 1 and 80),
  color text not null default 'folder-1'
    check (color in ('folder-1', 'folder-2', 'folder-3', 'folder-4', 'folder-5', 'folder-6')),
  icon text not null default 'folder'
    check (icon in ('folder', 'book', 'flask', 'scale', 'calc', 'code', 'heart', 'globe')),
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (parent_id, user_id) references public.folders (id, user_id)
);
create unique index folders_sibling_name on public.folders
  (user_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create index on public.folders (user_id, parent_id, position);

create function public.check_folder_tree() returns trigger
language plpgsql set search_path = '' as $$
declare
  above int;
  is_cycle boolean;
  height int;
begin
  with recursive up as (
    select f.id, f.parent_id from public.folders f where f.id = new.parent_id
    union all
    select f.id, f.parent_id from public.folders f join up on f.id = up.parent_id
  )
  select count(*), coalesce(bool_or(up.id = new.id), false) into above, is_cycle from up;

  with recursive down as (
    select new.id as id, 1 as lvl
    union all
    select f.id, down.lvl + 1 from public.folders f join down on f.parent_id = down.id
  )
  select max(lvl) into height from down;

  if is_cycle then
    raise exception 'Una cartella non può stare dentro sé stessa.' using errcode = 'check_violation';
  end if;
  if above + height > 3 then
    raise exception 'Le cartelle arrivano al massimo a 3 livelli.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger folders_tree before insert or update of parent_id on public.folders
  for each row execute function public.check_folder_tree();

create function public.default_folder_id() returns uuid
language sql stable set search_path = '' as $$
  select id from public.folders
  where user_id = (select auth.uid()) and parent_id is null
  order by position, created_at
  limit 1
$$;

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  folder_id uuid not null default public.default_folder_id(),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (folder_id, user_id) references public.folders (id, user_id)
);
create index on public.notes (folder_id, updated_at desc);

insert into public.folders (user_id, name) select id, 'Generale' from public.profiles;

alter table public.documents add column folder_id uuid;
alter table public.maps add column folder_id uuid;
alter table public.decks add column folder_id uuid;

update public.documents t set folder_id = f.id from public.folders f where f.user_id = t.user_id;
update public.maps t set folder_id = f.id from public.folders f where f.user_id = t.user_id;
update public.decks t set folder_id = f.id from public.folders f where f.user_id = t.user_id;

alter table public.documents
  alter column folder_id set not null,
  alter column folder_id set default public.default_folder_id(),
  add foreign key (folder_id, user_id) references public.folders (id, user_id);
alter table public.maps
  alter column folder_id set not null,
  alter column folder_id set default public.default_folder_id(),
  add foreign key (folder_id, user_id) references public.folders (id, user_id);
alter table public.decks
  alter column folder_id set not null,
  alter column folder_id set default public.default_folder_id(),
  add foreign key (folder_id, user_id) references public.folders (id, user_id);
create index on public.documents (folder_id);
create index on public.maps (folder_id);
create index on public.decks (folder_id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.folders (user_id, name) values (new.id, 'Generale');
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create function public.move_document(p_document uuid, p_folder uuid) returns void
language sql set search_path = '' as $$
  update public.documents set folder_id = p_folder where id = p_document;
  update public.maps set folder_id = p_folder where document_id = p_document;
  update public.decks set folder_id = p_folder where document_id = p_document;
$$;
revoke execute on function public.move_document from public, anon;
grant execute on function public.move_document to authenticated;

alter table public.profiles add column preferences jsonb not null default '{}'::jsonb
  check (jsonb_typeof(preferences) = 'object' and pg_column_size(preferences) < 2048);
grant update (preferences) on public.profiles to authenticated;

alter table public.folders enable row level security;
alter table public.notes enable row level security;

create policy "own folders" on public.folders for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own notes" on public.notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
