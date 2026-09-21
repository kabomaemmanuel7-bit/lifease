create table worker_services (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  price numeric not null,
  description text,
  created_at timestamptz not null default now()
);

alter table worker_services enable row level security;

create policy "Tout le monde peut lire les services"
  on worker_services for select
  using (true);

create policy "Le travailleur ajoute ses services"
  on worker_services for insert
  with check (worker_id = auth.uid());

create policy "Le travailleur modifie ses services"
  on worker_services for update
  using (worker_id = auth.uid());

create policy "Le travailleur supprime ses services"
  on worker_services for delete
  using (worker_id = auth.uid());
