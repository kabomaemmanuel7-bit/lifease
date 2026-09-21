create table problem_reports (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  status text not null default 'nouveau' check (status in ('nouveau', 'traite')),
  created_at timestamptz not null default now()
);

alter table problem_reports enable row level security;

create policy "Le travailleur peut créer son signalement"
  on problem_reports for insert
  with check (worker_id = auth.uid());

create policy "Le travailleur voit ses propres signalements"
  on problem_reports for select
  using (worker_id = auth.uid());
