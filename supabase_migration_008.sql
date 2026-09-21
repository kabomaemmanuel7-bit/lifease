insert into storage.buckets (id, name, public)
values ('interventions', 'interventions', true)
on conflict (id) do nothing;

create policy "Lecture publique des médias interventions"
on storage.objects for select
using (bucket_id = 'interventions');

create policy "Le travailleur upload ses médias"
on storage.objects for insert
with check (bucket_id = 'interventions' and auth.role() = 'authenticated');

alter table worker_portfolio 
  add column if not exists location text,
  add column if not exists video_url text;

alter table worker_portfolio enable row level security;

create policy "Tout le monde peut lire les interventions"
  on worker_portfolio for select
  using (true);

create policy "Le travailleur publie ses interventions"
  on worker_portfolio for insert
  with check (worker_id = auth.uid());

create policy "Le travailleur modifie ses interventions"
  on worker_portfolio for update
  using (worker_id = auth.uid());

create policy "Le travailleur supprime ses interventions"
  on worker_portfolio for delete
  using (worker_id = auth.uid());
