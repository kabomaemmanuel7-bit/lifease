alter table worker_portfolio add column if not exists image_urls text[] default '{}';

create table intervention_likes (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references worker_portfolio(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (portfolio_id, user_id)
);

alter table intervention_likes enable row level security;

create policy "Tout le monde voit les likes"
  on intervention_likes for select
  using (true);

create policy "Un utilisateur connecté peut liker"
  on intervention_likes for insert
  with check (user_id = auth.uid());

create policy "Un utilisateur retire son propre like"
  on intervention_likes for delete
  using (user_id = auth.uid());

create table intervention_comments (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references worker_portfolio(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

alter table intervention_comments enable row level security;

create policy "Tout le monde lit les commentaires"
  on intervention_comments for select
  using (true);

create policy "Un utilisateur connecté peut commenter"
  on intervention_comments for insert
  with check (user_id = auth.uid());

create policy "Un utilisateur supprime son propre commentaire"
  on intervention_comments for delete
  using (user_id = auth.uid());
