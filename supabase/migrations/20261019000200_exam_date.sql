alter table public.profiles add column exam_date date;

grant update (exam_date) on public.profiles to authenticated;
