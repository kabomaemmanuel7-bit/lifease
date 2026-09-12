-- ============================================
-- LifEase — Espace client : catégories, profils professionnels, demandes
-- ============================================

-- Catégories de services (gérables plus tard depuis le dashboard admin)
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null, -- nom d'icône (home, car, laptop, sparkles, heart-pulse)
  created_at timestamptz default now()
);

alter table categories enable row level security;

create policy "Tout utilisateur connecté peut voir les catégories"
  on categories for select
  to authenticated
  using (true);

insert into categories (slug, name, icon) values
  ('maison', 'Maison', 'home'),
  ('auto', 'Automobile', 'car'),
  ('tech', 'Technologie', 'laptop'),
  ('services', 'Services', 'sparkles'),
  ('sante', 'Santé & Bien-être', 'heart-pulse');

-- Profil professionnel détaillé (complète "profiles" pour role = 'travailleur')
create table worker_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  category_id uuid references categories(id),
  metier text not null,
  competences text[] default '{}',
  zone text,
  experience_years integer default 0,
  status text not null default 'disponible' check (status in ('disponible', 'occupe', 'indisponible')),
  description text,
  rating numeric(2,1) default 0,
  rating_count integer default 0,
  created_at timestamptz default now()
);

alter table worker_profiles enable row level security;

create policy "Tout utilisateur connecté peut voir les profils professionnels"
  on worker_profiles for select
  to authenticated
  using (true);

create policy "Un travailleur peut créer son propre profil professionnel"
  on worker_profiles for insert
  with check (auth.uid() = id);

create policy "Un travailleur peut modifier son propre profil professionnel"
  on worker_profiles for update
  using (auth.uid() = id);

-- Demandes d'intervention
create table requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  worker_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id),
  description text not null,
  urgency text not null default 'normal' check (urgency in ('normal', 'eleve', 'tres_eleve')),
  status text not null default 'en_attente' check (status in ('en_attente', 'acceptee', 'refusee', 'terminee')),
  created_at timestamptz default now()
);

alter table requests enable row level security;

create policy "Un utilisateur voit les demandes qui le concernent"
  on requests for select
  using (auth.uid() = client_id or auth.uid() = worker_id);

create policy "Un client peut créer une demande"
  on requests for insert
  with check (auth.uid() = client_id);

create policy "Le client ou le travailleur concerné peut modifier la demande"
  on requests for update
  using (auth.uid() = client_id or auth.uid() = worker_id);
