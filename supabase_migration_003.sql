-- ============================================================
-- Migration 003 — Évaluations (reviews)
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references requests(id) on delete cascade,
  client_id uuid not null references profiles(id) on delete cascade,
  worker_id uuid not null references profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table reviews enable row level security;

-- Lecture : tout utilisateur connecté peut voir les avis
create policy "reviews_select_authenticated"
  on reviews for select
  to authenticated
  using (true);

-- Création : uniquement le client concerné, sur une demande terminée et non déjà notée
create policy "reviews_insert_own_client"
  on reviews for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from requests r
      where r.id = request_id
        and r.client_id = auth.uid()
        and r.worker_id = reviews.worker_id
        and r.status = 'terminee'
    )
  );

-- ============================================================
-- Trigger : recalcul automatique de la note du travailleur
-- ============================================================
create or replace function update_worker_rating()
returns trigger
language plpgsql
security definer
as $$
begin
  update worker_profiles
  set
    rating = (
      select round(avg(rating)::numeric, 2)
      from reviews
      where worker_id = new.worker_id
    ),
    rating_count = (
      select count(*)
      from reviews
      where worker_id = new.worker_id
    )
  where id = new.worker_id;

  return new;
end;
$$;

drop trigger if exists trg_update_worker_rating on reviews;
create trigger trg_update_worker_rating
  after insert on reviews
  for each row
  execute function update_worker_rating();
