alter table public.notes add column document_id uuid references public.documents (id) on delete set null;
create index on public.notes (document_id) where document_id is not null;
