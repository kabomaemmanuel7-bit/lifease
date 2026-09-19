-- ============================================
-- LifEase — Migration 005 : profil public enrichi (bio, realisations),
-- formulaire de contact detaille, workflow intervention + paiement escrow
-- ============================================

-- 1. Biographie / CV sur le profil travailleur
alter table worker_profiles add column if not exists bio text;

-- 2. Realisations (portfolio) du travailleur
create table worker_portfolio (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  completed_at date,
  created_at timestamptz default now()
);

alter table worker_portfolio enable row level security;

create policy "Tout utilisateur connecte peut voir les realisations"
  on worker_portfolio for select
  to authenticated
  using (true);

create policy "Un travailleur gere ses propres realisations"
  on worker_portfolio for all
  to authenticated
  using (auth.uid() = worker_id)
  with check (auth.uid() = worker_id);

-- 3. Formulaire de contact detaille sur les demandes
alter table requests add column if not exists contact_name text;
alter table requests add column if not exists address text;
alter table requests add column if not exists google_maps_link text;
alter table requests add column if not exists video_url text;

-- 4. Montant propose par le travailleur a l'acceptation
alter table requests add column if not exists amount numeric(10,2);

-- 5. Preuve d'intervention
alter table requests add column if not exists proof_photos text[] default '{}';
alter table requests add column if not exists proof_date timestamptz;
alter table requests add column if not exists proof_location text;

-- 6. Statut de paiement sur la demande
alter table requests add column if not exists payment_status text not null default 'en_attente'
  check (payment_status in ('en_attente', 'paye', 'echoue', 'rembourse'));

-- 7. Transactions (suivi de la commission de la plateforme)
create table transactions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  amount numeric(10,2) not null,
  commission numeric(10,2) not null,
  worker_amount numeric(10,2) not null,
  status text not null default 'en_attente' check (status in ('en_attente', 'paye', 'echoue')),
  payment_provider text,
  payment_reference text,
  created_at timestamptz default now()
);

alter table transactions enable row level security;

create policy "Le client ou le travailleur concerne voit la transaction"
  on transactions for select
  to authenticated
  using (
    exists (
      select 1 from requests
      where requests.id = transactions.request_id
      and (requests.client_id = auth.uid() or requests.worker_id = auth.uid())
    )
  );

-- 8. Stockage des videos de panne et photos d'intervention
insert into storage.buckets (id, name, public)
values ('requests-media', 'requests-media', true)
on conflict (id) do nothing;

create policy "Lecture publique des medias de demande"
  on storage.objects for select
  using (bucket_id = 'requests-media');

create policy "Un utilisateur connecte peut deposer un media de demande"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'requests-media');
