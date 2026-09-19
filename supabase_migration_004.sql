-- ============================================
-- LifEase — Migration 004 : renommage categories -> services,
-- ajout de metiers, banniere d'accueil geree par l'admin
-- ============================================

-- 1. Renommage de la table et des colonnes liees
alter table categories rename to services;
alter table worker_profiles rename column category_id to service_id;
alter table requests rename column category_id to service_id;

-- 2. Ajout de nouveaux metiers (slug unique, ne duplique pas si deja present)
insert into services (slug, name, icon) values
  ('electricite', 'Electricite', 'zap'),
  ('construction', 'Construction & Batiment', 'hard-hat'),
  ('carrelage', 'Carrelage', 'grid'),
  ('menuiserie', 'Menuiserie', 'hammer'),
  ('soudure', 'Soudure', 'flame'),
  ('peinture', 'Peinture', 'paint-roller'),
  ('plomberie', 'Plomberie', 'wrench'),
  ('jardinage', 'Jardinage & Paysagisme', 'leaf'),
  ('menage', 'Nettoyage & Menage', 'sparkles'),
  ('demenagement', 'Demenagement', 'truck'),
  ('serrurerie', 'Serrurerie', 'key-round'),
  ('climatisation', 'Climatisation', 'wind'),
  ('electromenager', 'Reparation electromenager', 'tv'),
  ('coiffure', 'Coiffure & Esthetique', 'scissors'),
  ('couture', 'Couture', 'shirt'),
  ('informatique', 'Informatique & Depannage', 'laptop'),
  ('photographie', 'Photographie', 'camera'),
  ('traiteur', 'Traiteur & Cuisine', 'chef-hat'),
  ('transport', 'Transport & Livraison', 'package'),
  ('securite', 'Securite & Gardiennage', 'shield'),
  ('comptabilite', 'Comptabilite & Fiscalite', 'calculator')
on conflict (slug) do nothing;

-- 3. Banniere d'accueil geree par l'admin
create table banner_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  subtitle text,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table banner_slides enable row level security;

create policy "Tout utilisateur connecte peut voir les bannieres actives"
  on banner_slides for select
  to authenticated
  using (active = true);

create policy "Un admin peut tout gerer sur les bannieres"
  on banner_slides for all
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- 4. Stockage des images de banniere
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

create policy "Lecture publique des images de banniere"
  on storage.objects for select
  using (bucket_id = 'banners');

create policy "Un admin peut ajouter des images de banniere"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'banners'
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Un admin peut supprimer des images de banniere"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'banners'
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
