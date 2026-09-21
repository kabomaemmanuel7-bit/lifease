create table transactions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  amount numeric not null,
  commission numeric not null,
  worker_amount numeric not null,
  status text not null default 'en_attente' check (status in ('en_attente', 'paye', 'echoue')),
  created_at timestamptz not null default now()
);

alter table transactions enable row level security;

create policy "Le travailleur voit ses propres transactions"
  on transactions for select
  using (
    exists (
      select 1 from requests
      where requests.id = transactions.request_id
      and requests.worker_id = auth.uid()
    )
  );
