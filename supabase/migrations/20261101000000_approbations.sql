-- Table des approbations : tout ce qui attend le OK de Julien, tous agents confondus.
create table public.approbations (
  id uuid primary key default gen_random_uuid(),
  agent text not null check (agent in (
    'cerveau', 'bras_droit', 'tresorier', 'agent_pub', 'studio',
    'creatif', 'acheteur', 'ecommerce', 'rh', 'partenariats'
  )),
  titre text not null,
  details text,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'approuve', 'a_changer')),
  commentaire text,
  photo text, -- chemin du fichier dans le stockage « photos-approbations »
  cree_le timestamptz not null default now(),
  decide_le timestamptz,
  decide_par uuid references auth.users (id)
);

create index approbations_statut_idx on public.approbations (statut, cree_le desc);

-- Sécurité : seuls les utilisateurs connectés y ont accès. Pas de suppression (on garde l'historique).
alter table public.approbations enable row level security;

revoke all on public.approbations from anon;
grant select, insert, update on public.approbations to authenticated;

create policy "Connectés : lire" on public.approbations
  for select to authenticated using (true);

create policy "Connectés : ajouter" on public.approbations
  for insert to authenticated with check (true);

create policy "Connectés : décider" on public.approbations
  for update to authenticated using (true) with check (true);

-- Stockage privé pour les photos jointes aux approbations.
insert into storage.buckets (id, name, public)
values ('photos-approbations', 'photos-approbations', false);

create policy "Connectés : voir les photos" on storage.objects
  for select to authenticated using (bucket_id = 'photos-approbations');

create policy "Connectés : ajouter des photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos-approbations');
