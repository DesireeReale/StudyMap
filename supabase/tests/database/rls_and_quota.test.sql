begin;
select plan(9);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local');

select is((select count(*)::int from public.profiles), 2, 'profiles created by trigger');

insert into public.documents (user_id, title, kind) values
  ('11111111-1111-1111-1111-111111111111', 'Doc A', 'text'),
  ('22222222-2222-2222-2222-222222222222', 'Doc B', 'text');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select is((select count(*)::int from public.documents), 1, 'user sees only own documents');
select is((select title from public.documents), 'Doc A', 'and it is the right one');

select throws_ok(
  $$ update public.profiles set plan = 'pro' $$,
  '42501', null, 'plan is not writable by the client'
);
select lives_ok(
  $$ update public.profiles set ai_data_sharing_consent_at = now() $$,
  'consent is writable by the client'
);
select throws_ok(
  $$ select public.consume_quota('11111111-1111-1111-1111-111111111111', 'generation', '2026-10', 1, 5) $$,
  '42501', null, 'clients cannot consume quota directly'
);

reset role;

select ok(public.consume_quota('11111111-1111-1111-1111-111111111111', 'generation', '2026-10', 1, 2), 'first within limit');
select ok(public.consume_quota('11111111-1111-1111-1111-111111111111', 'generation', '2026-10', 1, 2), 'second within limit');
select ok(not public.consume_quota('11111111-1111-1111-1111-111111111111', 'generation', '2026-10', 1, 2), 'third rejected');

select * from finish();
rollback;
