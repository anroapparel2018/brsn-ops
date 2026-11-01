-- Fondations de la nuit du 1er novembre 2026 : tâches, notes, coûts de l'IA, données des outils,
-- réglages, fiches et notifications. Ajouts seulement ; accès réservé au compte de Julien.

create or replace function public.est_julien()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'email') = 'julien@anroapparel.ca', false)
$$;

-- Tâches et rappels
create table public.taches (
  id uuid primary key default gen_random_uuid(),
  titre text not null check (length(titre) between 1 and 500),
  details text,
  agent text not null default 'cerveau' check (agent in (
    'cerveau', 'bras_droit', 'tresorier', 'agent_pub', 'studio',
    'creatif', 'acheteur', 'ecommerce', 'rh', 'partenariats'
  )),
  categorie text not null default 'plus_tard'
    check (categorie in ('urgent', 'aujourdhui', 'semaine', 'plus_tard', 'deleguer')),
  echeance date,
  rappel_le timestamptz,
  rappel_vu boolean not null default false,
  recurrence text check (recurrence in ('hebdo', '2sem', 'mensuel', 'trimestriel', '1er_lundi')),
  statut text not null default 'a_faire' check (statut in ('a_faire', 'fait')),
  fait_le timestamptz,
  source text not null default 'manuel' check (source in ('manuel', 'cerveau', 'note', 'systeme')),
  cree_le timestamptz not null default now()
);
create index taches_a_faire_idx on public.taches (statut, categorie, rappel_le);

-- Notes rapides (bouton « + Note »)
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  contenu text not null check (length(contenu) between 1 and 5000),
  source text not null default 'texte' check (source in ('texte', 'vocal')),
  suggestion jsonb,
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'transformee', 'classee')),
  cree_le timestamptz not null default now()
);

-- Coût de l'API Claude : une ligne par appel
create table public.usage_ia (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  modele text not null,
  jetons_entree integer not null default 0,
  jetons_sortie integer not null default 0,
  jetons_cache_lus integer not null default 0,
  jetons_cache_ecrits integer not null default 0,
  cout_usd numeric(12, 6) not null default 0,
  cree_le timestamptz not null default now()
);
create index usage_ia_mois_idx on public.usage_ia (cree_le);

-- Données des anciens outils (remplace le « db » des artefacts et leur localStorage)
create table public.outils_donnees (
  outil text not null,
  chemin text not null,
  donnees jsonb not null default '{}'::jsonb,
  maj_le timestamptz not null default now(),
  primary key (outil, chemin)
);
create index outils_donnees_prefixe_idx on public.outils_donnees (outil, chemin text_pattern_ops);

-- Réglages de l'app (ex. objectif de ventes)
create table public.reglages (
  cle text primary key,
  valeur jsonb not null,
  maj_le timestamptz not null default now()
);

-- Fiches : fournisseurs, partenaires, employés, équipement, sites, comptes…
create table public.fiches (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in (
    'fournisseur', 'partenaire', 'employe', 'equipement', 'formation', 'site', 'marque', 'compte', 'paiement', 'kilometrage'
  )),
  nom text not null check (length(nom) between 1 and 300),
  sous_titre text,
  details text,
  echeance date,
  donnees jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now()
);
create index fiches_type_idx on public.fiches (type, nom);

-- Abonnements aux notifications (Web Push)
create table public.push_abonnements (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  abonnement jsonb not null,
  cree_le timestamptz not null default now()
);

-- Sécurité : seulement Julien
do $$
declare t text;
begin
  foreach t in array array['taches', 'notes', 'usage_ia', 'outils_donnees', 'reglages', 'fiches', 'push_abonnements']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "Julien seulement" on public.%I for all to authenticated using ((select public.est_julien())) with check ((select public.est_julien()))',
      t
    );
  end loop;
end $$;

-- Fichiers des outils (photos, guides, pièces jointes) : stockage privé
insert into storage.buckets (id, name, public) values ('fichiers-outils', 'fichiers-outils', false);

create policy "Julien : voir les fichiers des outils" on storage.objects
  for select to authenticated using (bucket_id = 'fichiers-outils' and (select public.est_julien()));
create policy "Julien : ajouter des fichiers aux outils" on storage.objects
  for insert to authenticated with check (bucket_id = 'fichiers-outils' and (select public.est_julien()));
create policy "Julien : retirer un fichier d'un outil" on storage.objects
  for delete to authenticated using (bucket_id = 'fichiers-outils' and (select public.est_julien()));
