alter table public.documents
  add column review_pages int[],
  add column review_create text[] not null default '{}';
