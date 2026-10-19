create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  ai_data_sharing_consent_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  kind text not null check (kind in ('pdf', 'image', 'text')),
  storage_path text,
  page_count int not null default 0,
  pages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.documents (user_id, created_at desc);

create table public.maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  title text not null,
  graph jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.maps (user_id, updated_at desc);

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  title text not null,
  created_at timestamptz not null default now()
);
create index on public.decks (user_id, created_at desc);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  front text not null,
  back text not null,
  position int not null default 0,
  last_result text check (last_result in ('known', 'unknown')),
  reviewed_at timestamptz
);
create index on public.flashcards (deck_id, position);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  task text not null,
  provider text not null,
  model text not null,
  prompt_version text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  ocr_pages int not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  ok boolean not null,
  error text,
  created_at timestamptz not null default now()
);
create index on public.ai_usage (user_id, created_at desc);

create table public.quota_counters (
  user_id uuid not null references public.profiles (id) on delete cascade,
  period text not null,
  kind text not null,
  count bigint not null default 0,
  primary key (user_id, period, kind)
);

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.maps enable row level security;
alter table public.decks enable row level security;
alter table public.flashcards enable row level security;
alter table public.ai_usage enable row level security;
alter table public.quota_counters enable row level security;

create policy "own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (ai_data_sharing_consent_at) on public.profiles to authenticated;

create policy "own documents" on public.documents for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own maps" on public.maps for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own decks" on public.decks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own flashcards" on public.flashcards for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.decks d where d.id = deck_id and d.user_id = (select auth.uid()))
  );

create policy "own usage" on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));
create policy "own quotas" on public.quota_counters for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.ai_usage, public.quota_counters from authenticated, anon;

create function public.consume_quota(
  p_user uuid, p_kind text, p_period text, p_amount bigint default 1, p_limit bigint default null
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  ok boolean;
begin
  if p_limit is not null and p_amount > p_limit then
    return false;
  end if;
  insert into public.quota_counters as q (user_id, period, kind, count)
  values (p_user, p_period, p_kind, greatest(p_amount, 0))
  on conflict (user_id, period, kind) do update
    set count = greatest(q.count + p_amount, 0)
    where p_limit is null or q.count + p_amount <= p_limit
  returning true into ok;
  return coalesce(ok, false);
end;
$$;

revoke execute on function public.consume_quota from public, anon, authenticated;
grant execute on function public.consume_quota to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 26214400,
        array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

create policy "own files read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
