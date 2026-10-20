alter table public.ai_jobs drop constraint ai_jobs_type_check;
alter table public.ai_jobs add constraint ai_jobs_type_check
  check (type in ('ingest', 'mindmap', 'flashcards', 'summary', 'quiz'));
alter table public.ai_jobs drop constraint ai_jobs_check;
alter table public.ai_jobs add constraint ai_jobs_source_check
  check (type = 'ingest' or (document_id is null) <> (note_id is null));
alter table public.ai_jobs alter column quota_period drop not null;

alter table public.ai_jobs
  add column title text not null default '' check (char_length(title) <= 200),
  add column phase text not null default 'queued'
    check (phase in ('queued', 'read', 'transcribe', 'generate', 'merge', 'done', 'error')),
  add column done int not null default 0 check (done >= 0),
  add column total int not null default 0 check (total >= 0),
  add column seen_at timestamptz;
