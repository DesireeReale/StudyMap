alter table public.profiles
  add column beta_terms_accepted_at timestamptz,
  add column beta_terms_version text check (char_length(beta_terms_version) <= 40);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  terms text := left(new.raw_user_meta_data ->> 'beta_terms_version', 40);
begin
  insert into public.profiles (id, beta_terms_version, beta_terms_accepted_at)
  values (new.id, terms, case when terms is null then null else now() end);
  insert into public.folders (user_id, name) values (new.id, 'Generale');
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant update (beta_terms_accepted_at, beta_terms_version) on public.profiles to authenticated;
