create table worker_cv_entries (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('competence','diplome','experience','stage','formation')),
  title text not null,
  institution text,
  period text,
  description text,
  created_at timestamptz not null default now()
);

alter table worker_cv_entries enable row level security;

create policy "Tout le monde peut lire le CV"
  on worker_cv_entries for select
  using (true);

create policy "Le travailleur gère son propre CV"
  on worker_cv_entries for insert
  with check (worker_id = auth.uid());

create policy "Le travailleur modifie son propre CV"
  on worker_cv_entries for update
  using (worker_id = auth.uid());

create policy "Le travailleur supprime ses propres entrées"
  on worker_cv_entries for delete
  using (worker_id = auth.uid());
