-- Tri partout : Accepter (je m'en occupe), Reporter (revient tel jour), Supprimer (archivé, récupérable).
-- Migration additive. Testée sur la base de TEST ; en production seulement après le « go » de Julien.

alter table public.taches add column accepte_le timestamptz;
alter table public.taches add column reporte_au date;
alter table public.taches add column archive_le timestamptz;
alter table public.taches add column clickup_id text;

alter table public.alertes add column accepte_le timestamptz;
alter table public.alertes add column reporte_au date;
alter table public.alertes add column archive_le timestamptz;
alter table public.alertes add column pourquoi text;
alter table public.alertes add column action text;
alter table public.alertes add column tache_id uuid references public.taches (id);

alter table public.approbations add column reporte_au date;

-- Historique de chaque choix (pour retrouver et restaurer).
create table public.historique_tri (
  id bigint generated always as identity primary key,
  compagnie_id uuid not null references public.compagnies (id),
  user_id uuid not null references auth.users (id) default auth.uid(),
  cible text not null check (cible in ('tache', 'alerte', 'approbation', 'clickup')),
  cible_id text not null,
  titre text,
  action text not null check (action in ('accepter', 'reporter', 'supprimer', 'restaurer', 'approuver', 'a_changer')),
  reporte_au date,
  commentaire text,
  cree_le timestamptz not null default now()
);
create index historique_tri_idx on public.historique_tri (compagnie_id, cree_le desc);
alter table public.historique_tri enable row level security;
revoke all on public.historique_tri from anon;
grant select, insert on public.historique_tri to authenticated;
create policy "Membres : lire l'historique" on public.historique_tri for select to authenticated using (public.est_membre(compagnie_id));
create policy "Membres : inscrire un choix" on public.historique_tri for insert to authenticated
  with check (public.est_membre(compagnie_id) and user_id = (select auth.uid()));

create index taches_actives_idx on public.taches (compagnie_id, user_id) where statut = 'a_faire' and archive_le is null;

alter table public.approbations add column archive_le timestamptz;

-- Tri des tâches du POOL ClickUp (la tâche vit dans ClickUp ; ici, seulement le choix de Julien).
create table public.tri_clickup (
  clickup_id text not null,
  compagnie_id uuid not null references public.compagnies (id),
  user_id uuid not null references auth.users (id) default auth.uid(),
  titre text,
  accepte_le timestamptz,
  reporte_au date,
  archive_le timestamptz,
  maj_le timestamptz not null default now(),
  primary key (compagnie_id, user_id, clickup_id)
);
alter table public.tri_clickup enable row level security;
revoke all on public.tri_clickup from anon;
grant select, insert, update on public.tri_clickup to authenticated;
create policy "Mes choix ClickUp" on public.tri_clickup for all to authenticated
  using (user_id = (select auth.uid()) and public.est_membre(compagnie_id))
  with check (user_id = (select auth.uid()) and public.est_membre(compagnie_id));
