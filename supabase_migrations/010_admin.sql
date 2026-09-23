create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "L'admin voit tous les signalements"
  on problem_reports for select
  using (is_admin());

create policy "L'admin met à jour le statut des signalements"
  on problem_reports for update
  using (is_admin());

create policy "L'admin voit tous les profils"
  on profiles for select
  using (is_admin() or id = auth.uid());
