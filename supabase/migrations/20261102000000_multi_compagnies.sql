-- ============================================================================
-- MULTI-COMPAGNIES — fondation (phase 2 de la refonte)
-- ⚠️ Touche des tables existantes : testée sur la base de TEST seulement.
--    À appliquer en production uniquement après l'approbation de Julien.
-- Aucune donnée supprimée : les données existantes sont rattachées à ANRO Apparel.
-- ============================================================================

-- 1. Compagnies, membres, rôles ------------------------------------------------

create table public.compagnies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  nom text not null check (length(nom) between 1 and 120),
  logo_url text,
  statut text not null default 'active' check (statut in ('active', 'en_attente', 'desactivee')),
  cree_le timestamptz not null default now(),
  cree_par uuid references auth.users (id)
);

-- Super-administrateurs de toute la plateforme (Julien).
create table public.super_admins (
  user_id uuid primary key references auth.users (id),
  cree_le timestamptz not null default now()
);

create table public.membres (
  compagnie_id uuid not null references public.compagnies (id),
  user_id uuid not null references auth.users (id),
  role text not null default 'employe' check (role in ('super_admin', 'admin', 'employe', 'client')),
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  primary key (compagnie_id, user_id)
);
create index membres_user_idx on public.membres (user_id) where actif;

-- Fonctions de sécurité (utilisées par toutes les règles RLS) ----------------
create or replace function public.est_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.super_admins where user_id = (select auth.uid()))
      or exists (select 1 from public.membres where user_id = (select auth.uid()) and role = 'super_admin' and actif)
$$;

-- Membre actif (admin ou employé) d'une compagnie active, ou super-admin.
create or replace function public.est_membre(p_compagnie uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.est_super_admin() or exists (
    select 1 from public.membres m join public.compagnies c on c.id = m.compagnie_id
    where m.compagnie_id = p_compagnie and m.user_id = (select auth.uid())
      and m.actif and m.role in ('super_admin', 'admin', 'employe') and c.statut = 'active'
  )
$$;

create or replace function public.est_admin_de(p_compagnie uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.est_super_admin() or exists (
    select 1 from public.membres
    where compagnie_id = p_compagnie and user_id = (select auth.uid()) and actif and role in ('super_admin', 'admin')
  )
$$;

-- Compagnies où j'ai un accès (y compris comme client).
create or replace function public.mes_compagnies()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select id from public.compagnies where public.est_super_admin()
  union
  select compagnie_id from public.membres where user_id = (select auth.uid()) and actif
$$;

revoke all on function public.est_super_admin(), public.est_membre(uuid), public.est_admin_de(uuid), public.mes_compagnies() from public, anon;
grant execute on function public.est_super_admin(), public.est_membre(uuid), public.est_admin_de(uuid), public.mes_compagnies() to authenticated;

alter table public.compagnies enable row level security;
alter table public.super_admins enable row level security;
alter table public.membres enable row level security;
revoke all on public.compagnies, public.super_admins, public.membres from anon;
grant select, insert, update on public.compagnies, public.membres to authenticated;
grant select on public.super_admins to authenticated;

create policy "Voir mes compagnies" on public.compagnies for select to authenticated
  using (id in (select public.mes_compagnies()));
create policy "Super-admin : créer une compagnie" on public.compagnies for insert to authenticated
  with check (public.est_super_admin());
create policy "Admin : modifier sa compagnie" on public.compagnies for update to authenticated
  using (public.est_admin_de(id)) with check (public.est_admin_de(id) and (public.est_super_admin() or statut = 'active'));

create policy "Voir les membres de mes compagnies" on public.membres for select to authenticated
  using (user_id = (select auth.uid()) or public.est_admin_de(compagnie_id));
create policy "Admin : ajouter un membre" on public.membres for insert to authenticated
  with check (public.est_admin_de(compagnie_id));
create policy "Admin : modifier un membre" on public.membres for update to authenticated
  using (public.est_admin_de(compagnie_id)) with check (public.est_admin_de(compagnie_id));

create policy "Super-admin : se voir" on public.super_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- 2. Invitations (préparées ; aucun courriel n'est envoyé sans approbation) ---
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  compagnie_id uuid not null references public.compagnies (id),
  courriel text not null check (courriel ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null default 'employe' check (role in ('super_admin', 'admin', 'employe', 'client')),
  empreinte_jeton text, -- SHA-256 du lien d'invitation (le lien lui-même n'est jamais gardé)
  statut text not null default 'preparee' check (statut in ('preparee', 'approuvee', 'envoyee', 'acceptee', 'annulee')),
  cree_par uuid references auth.users (id) default auth.uid(),
  cree_le timestamptz not null default now(),
  expire_le timestamptz not null default now() + interval '7 days'
);
alter table public.invitations enable row level security;
revoke all on public.invitations from anon;
grant select, insert, update on public.invitations to authenticated;
create policy "Admin : gérer les invitations" on public.invitations for all to authenticated
  using (public.est_admin_de(compagnie_id)) with check (public.est_admin_de(compagnie_id));

-- 3. Image de marque par compagnie ---------------------------------------------
create table public.profils_marque (
  compagnie_id uuid primary key references public.compagnies (id),
  couleurs jsonb not null default '{}'::jsonb,  -- principale, secondaire, fond, surface, texte, accent
  polices jsonb not null default '{}'::jsonb,   -- titres, texte
  logo_url text,          -- logo clair (sur fond sombre)
  logo_sombre_url text,   -- logo sombre (sur fond clair)
  icone_url text,
  voix text,                                     -- ton des agents pour cette compagnie
  guide_fichiers jsonb not null default '[]'::jsonb,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'approuvee')),
  maj_le timestamptz not null default now()
);
alter table public.profils_marque enable row level security;
revoke all on public.profils_marque from anon;
grant select, insert, update on public.profils_marque to authenticated;
create policy "Voir la marque de mes compagnies" on public.profils_marque for select to authenticated
  using (compagnie_id in (select public.mes_compagnies()));
create policy "Admin : modifier la marque" on public.profils_marque for all to authenticated
  using (public.est_admin_de(compagnie_id)) with check (public.est_admin_de(compagnie_id));

-- 3b. Agents et outils : modèles partagés + copies par compagnie ---------------
create table public.modeles_agents (
  id uuid primary key default gen_random_uuid(),
  cle text not null unique,
  nom text not null,
  role text not null,
  icone text not null default '🤖',
  instructions text not null default '',
  outils_defaut text[] not null default '{}',
  ordre integer not null default 0,
  maj_le timestamptz not null default now()
);
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  compagnie_id uuid not null references public.compagnies (id),
  modele_id uuid references public.modeles_agents (id),
  cle text not null,
  nom text not null,
  role text not null,
  icone text not null default '🤖',
  instructions text not null default '', -- ajustements propres à la compagnie
  actif boolean not null default true,
  ordre integer not null default 0,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  unique (compagnie_id, cle)
);
create index agents_compagnie_idx on public.agents (compagnie_id, actif, ordre);

create table public.outils (
  id uuid primary key default gen_random_uuid(),
  cle text not null unique,
  nom text not null,
  description text not null default '',
  categorie text not null default 'Outils',
  icone text not null default '🧰',
  lien text not null,
  roles_autorises text[] not null default '{super_admin,admin,employe}',
  compagnies_autorisees uuid[], -- null = toutes
  etat text not null default 'fonctionne' check (etat in ('fonctionne', 'a_finir', 'doublon')),
  ordre integer not null default 0,
  actif boolean not null default true
);
create table public.agents_outils (
  agent_id uuid not null references public.agents (id),
  outil_id uuid not null references public.outils (id),
  favori boolean not null default false,
  ordre integer not null default 0,
  primary key (agent_id, outil_id)
);

alter table public.modeles_agents enable row level security;
alter table public.agents enable row level security;
alter table public.outils enable row level security;
alter table public.agents_outils enable row level security;
revoke all on public.modeles_agents, public.agents, public.outils, public.agents_outils from anon;
grant select on public.modeles_agents, public.outils to authenticated;
grant select, insert, update on public.agents, public.agents_outils to authenticated;
grant insert, update on public.modeles_agents, public.outils to authenticated;
create policy "Lire les modèles d'agents" on public.modeles_agents for select to authenticated using (true);
create policy "Super-admin : modèles d'agents" on public.modeles_agents for all to authenticated
  using (public.est_super_admin()) with check (public.est_super_admin());
create policy "Voir les agents de ma compagnie" on public.agents for select to authenticated
  using (public.est_membre(compagnie_id));
create policy "Admin : gérer les agents" on public.agents for all to authenticated
  using (public.est_admin_de(compagnie_id)) with check (public.est_admin_de(compagnie_id));
create policy "Lire le registre des outils" on public.outils for select to authenticated using (actif);
create policy "Super-admin : registre des outils" on public.outils for all to authenticated
  using (public.est_super_admin()) with check (public.est_super_admin());
create policy "Voir les outils de mes agents" on public.agents_outils for select to authenticated
  using (exists (select 1 from public.agents a where a.id = agent_id and public.est_membre(a.compagnie_id)));
create policy "Admin : outils des agents" on public.agents_outils for all to authenticated
  using (exists (select 1 from public.agents a where a.id = agent_id and public.est_admin_de(a.compagnie_id)))
  with check (exists (select 1 from public.agents a where a.id = agent_id and public.est_admin_de(a.compagnie_id)));

-- 3c. Notifications internes (push désactivé tant que Julien n'approuve pas) ---
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  compagnie_id uuid not null references public.compagnies (id),
  user_id uuid not null references auth.users (id),
  titre text not null,
  texte text,
  couleur text not null default 'rouge' check (couleur in ('rouge', 'orange', 'rose', 'vert', 'bleu', 'violet', 'jaune')),
  lien text,
  groupe text, -- regroupe les notifications semblables
  lue boolean not null default false,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, lue, cree_le desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon;
grant select, insert, update on public.notifications to authenticated;
create policy "Mes notifications" on public.notifications for all to authenticated
  using (user_id = (select auth.uid()) and public.est_membre(compagnie_id))
  with check (public.est_membre(compagnie_id));

-- 4. Forfaits et abonnements (structure seulement : rien n'est activé ni facturé)
create table public.forfaits (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prix_mensuel_cents integer not null default 0 check (prix_mensuel_cents >= 0),
  agents text[] not null default '{}',
  actif boolean not null default false
);
create table public.abonnements (
  compagnie_id uuid primary key references public.compagnies (id),
  forfait_id uuid references public.forfaits (id),
  statut text not null default 'inactif' check (statut in ('inactif', 'essai', 'actif', 'suspendu')),
  maj_le timestamptz not null default now()
);
alter table public.forfaits enable row level security;
alter table public.abonnements enable row level security;
revoke all on public.forfaits, public.abonnements from anon;
grant select on public.forfaits, public.abonnements to authenticated;
create policy "Voir les forfaits" on public.forfaits for select to authenticated using (true);
create policy "Voir l'abonnement de mes compagnies" on public.abonnements for select to authenticated
  using (public.est_admin_de(compagnie_id));

-- 5. Réglages de la plateforme (super-admin) ----------------------------------
create table public.reglages_plateforme (
  cle text primary key,
  valeur jsonb not null,
  maj_le timestamptz not null default now()
);
alter table public.reglages_plateforme enable row level security;
revoke all on public.reglages_plateforme from anon;
grant select, insert, update on public.reglages_plateforme to authenticated;
create policy "Lire les réglages de la plateforme" on public.reglages_plateforme for select to authenticated using (true);
create policy "Super-admin : modifier la plateforme" on public.reglages_plateforme for all to authenticated
  using (public.est_super_admin()) with check (public.est_super_admin());
insert into public.reglages_plateforme (cle, valeur) values ('inscription_libre', 'false'::jsonb);

-- 6. Journal d'activité ---------------------------------------------------------
create table public.journal_activite (
  id bigint generated always as identity primary key,
  compagnie_id uuid references public.compagnies (id),
  user_id uuid references auth.users (id) default auth.uid(),
  action text not null,
  cible text,
  details jsonb,
  cree_le timestamptz not null default now()
);
create index journal_compagnie_idx on public.journal_activite (compagnie_id, cree_le desc);
alter table public.journal_activite enable row level security;
revoke all on public.journal_activite from anon;
grant select, insert on public.journal_activite to authenticated;
create policy "Admin : lire le journal" on public.journal_activite for select to authenticated
  using (public.est_admin_de(compagnie_id));
create policy "Membre : écrire au journal" on public.journal_activite for insert to authenticated
  with check (public.est_membre(compagnie_id) and user_id = (select auth.uid()));

-- 7. Compagnies de départ -------------------------------------------------------
insert into public.compagnies (slug, nom) values
  ('anro', 'ANRO Apparel'),
  ('le-studio', 'Le Stud.io'),
  ('brsn', 'BRSN'),
  ('gestion-jb', 'Gestion Julien Brisson inc.'),
  ('wide-the-brand', 'Wide the Brand'),
  ('nobl-co', 'NOBL & CO'),
  ('nora', 'NORA Apparel');

insert into public.profils_marque (compagnie_id, couleurs, polices, voix, statut)
select id,
  '{"principale":"#4A1620","secondaire":"#2F0D14","fond":"#0F0A0A","texte":"#FFFFFF","accent":"#4A1620"}'::jsonb,
  '{"titres":"Fira Sans","texte":"Fira Sans"}'::jsonb,
  'Tutoiement, ton direct et chaleureux, « la famille ».', 'approuvee'
from public.compagnies where slug = 'anro';

insert into public.profils_marque (compagnie_id, couleurs, polices, voix, statut)
select id,
  '{"principale":"#CC5500","secondaire":"#141414","fond":"#141414","texte":"#F6F4F1","accent":"#CC5500"}'::jsonb,
  '{"titres":"Archivo","texte":"Archivo"}'::jsonb,
  'Tutoiement, français du Québec, direct et efficace.', 'approuvee'
from public.compagnies where slug in ('brsn', 'gestion-jb');

-- Julien : super-admin et administrateur de toutes les compagnies de départ.
insert into public.super_admins (user_id)
select id from auth.users where email = 'julien@anroapparel.ca';
insert into public.membres (compagnie_id, user_id, role)
select c.id, u.id, 'admin' from public.compagnies c cross join auth.users u where u.email = 'julien@anroapparel.ca';

-- 8. compagnie_id sur les données existantes (rattachées à ANRO Apparel) -------
do $$
declare
  t text;
  anro uuid := (select id from public.compagnies where slug = 'anro');
begin
  foreach t in array array['approbations', 'alertes', 'taches', 'notes', 'usage_ia', 'outils_donnees',
                           'fiches', 'reglages', 'priorites', 'messages_agents', 'push_abonnements']
  loop
    execute format('alter table public.%I add column compagnie_id uuid references public.compagnies (id)', t);
    execute format('update public.%I set compagnie_id = %L', t, anro);
    execute format('alter table public.%I alter column compagnie_id set not null', t);
    execute format('create index %I on public.%I (compagnie_id)', t || '_compagnie_idx', t);
  end loop;
end $$;

-- Notes et abonnements push : à la personne (en plus de la compagnie).
alter table public.notes add column user_id uuid references auth.users (id) default auth.uid();
update public.notes set user_id = (select id from auth.users where email = 'julien@anroapparel.ca');
alter table public.push_abonnements add column user_id uuid references auth.users (id) default auth.uid();
update public.push_abonnements set user_id = (select id from auth.users where email = 'julien@anroapparel.ca');
alter table public.taches add column user_id uuid references auth.users (id) default auth.uid();
update public.taches set user_id = (select id from auth.users where email = 'julien@anroapparel.ca');

-- Clés uniques par compagnie (réglages, données des anciens outils).
alter table public.reglages drop constraint reglages_pkey;
alter table public.reglages add primary key (compagnie_id, cle);
alter table public.outils_donnees drop constraint outils_donnees_pkey;
alter table public.outils_donnees add primary key (compagnie_id, outil, chemin);
drop index if exists public.outils_donnees_prefixe_idx;
create index outils_donnees_prefixe_idx on public.outils_donnees (compagnie_id, outil, chemin text_pattern_ops);

-- Agents propres à chaque compagnie : on retire la liste fixe d'agents.
alter table public.approbations drop constraint if exists approbations_agent_check;
alter table public.alertes drop constraint if exists alertes_agent_check;
alter table public.taches drop constraint if exists taches_agent_check;
alter table public.messages_agents drop constraint if exists messages_agents_agent_check;

-- 9. Nouvelles règles RLS : une compagnie ne voit jamais les données d'une autre
do $$
declare r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public' and tablename in
    ('approbations', 'alertes', 'taches', 'notes', 'usage_ia', 'outils_donnees', 'fiches', 'reglages',
     'priorites', 'messages_agents', 'push_abonnements')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Données de la compagnie (partagées entre ses membres).
do $$
declare t text;
begin
  foreach t in array array['approbations', 'alertes', 'fiches', 'reglages', 'outils_donnees', 'usage_ia']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "Membres de la compagnie" on public.%I for all to authenticated using (public.est_membre(compagnie_id)) with check (public.est_membre(compagnie_id))',
      t);
  end loop;
end $$;

-- Données personnelles, dans une compagnie.
create policy "Mes tâches dans ma compagnie" on public.taches for all to authenticated
  using (user_id = (select auth.uid()) and public.est_membre(compagnie_id))
  with check (user_id = (select auth.uid()) and public.est_membre(compagnie_id));
create policy "Mes notes dans ma compagnie" on public.notes for all to authenticated
  using (user_id = (select auth.uid()) and public.est_membre(compagnie_id))
  with check (user_id = (select auth.uid()) and public.est_membre(compagnie_id));
create policy "Mes priorités dans ma compagnie" on public.priorites for all to authenticated
  using (cree_par = (select auth.uid()) and public.est_membre(compagnie_id))
  with check (cree_par = (select auth.uid()) and public.est_membre(compagnie_id));
create policy "Mes conversations dans ma compagnie" on public.messages_agents for all to authenticated
  using (user_id = (select auth.uid()) and public.est_membre(compagnie_id))
  with check (user_id = (select auth.uid()) and public.est_membre(compagnie_id));
create policy "Mes appareils" on public.push_abonnements for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.taches, public.notes, public.priorites, public.push_abonnements to authenticated;
grant select, insert on public.messages_agents to authenticated;

-- Fichiers des anciens outils : rangés par compagnie (premier dossier = id de la compagnie).
create or replace function public.uuid_ou_null(p text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin return p::uuid; exception when others then return null; end;
$$;
drop policy if exists "Julien : voir les fichiers des outils" on storage.objects;
drop policy if exists "Julien : ajouter des fichiers aux outils" on storage.objects;
drop policy if exists "Julien : retirer un fichier d'un outil" on storage.objects;
create policy "Fichiers des outils : membres" on storage.objects for all to authenticated
  using (bucket_id = 'fichiers-outils' and (public.est_membre(public.uuid_ou_null((storage.foldername(name))[1])) or public.est_super_admin()))
  with check (bucket_id = 'fichiers-outils' and (public.est_membre(public.uuid_ou_null((storage.foldername(name))[1])) or public.est_super_admin()));
drop policy if exists "Connectés : voir les photos" on storage.objects;
drop policy if exists "Connectés : ajouter des photos" on storage.objects;
create policy "Photos d'approbation : membres" on storage.objects for all to authenticated
  using (bucket_id = 'photos-approbations' and (public.est_membre(public.uuid_ou_null((storage.foldername(name))[1])) or public.est_super_admin()))
  with check (bucket_id = 'photos-approbations' and (public.est_membre(public.uuid_ou_null((storage.foldername(name))[1])) or public.est_super_admin()));

-- 10. Clients : ils voient seulement les approbations partagées avec eux --------
alter table public.approbations add column partage_client boolean not null default false;
alter table public.approbations add column type text not null default 'autre'
  check (type in ('pub', 'contenu', 'courriel', 'commande', 'autre'));
create or replace function public.est_client_de(p_compagnie uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membres m join public.compagnies c on c.id = m.compagnie_id
    where m.compagnie_id = p_compagnie and m.user_id = (select auth.uid())
      and m.actif and m.role = 'client' and c.statut = 'active'
  )
$$;
revoke all on function public.est_client_de(uuid) from public, anon;
grant execute on function public.est_client_de(uuid) to authenticated;
create policy "Client : voir ce qui est partagé" on public.approbations for select to authenticated
  using (partage_client and public.est_client_de(compagnie_id));
create policy "Client : approuver ce qui est partagé" on public.approbations for update to authenticated
  using (partage_client and statut = 'en_attente' and public.est_client_de(compagnie_id))
  with check (partage_client and public.est_client_de(compagnie_id));

-- 11. Dates de mise à jour et index de listes (compagnie + statut + date) ------
alter table public.taches add column maj_le timestamptz not null default now();
alter table public.notes add column maj_le timestamptz not null default now();
alter table public.approbations add column maj_le timestamptz not null default now();
create index taches_liste_idx on public.taches (compagnie_id, user_id, statut, cree_le desc);
create index notes_liste_idx on public.notes (compagnie_id, user_id, statut, cree_le desc);
create index approbations_liste_idx on public.approbations (compagnie_id, statut, cree_le desc);
create index alertes_liste_idx on public.alertes (compagnie_id, cree_le desc) where vue_le is null;
create index messages_liste_idx on public.messages_agents (compagnie_id, user_id, agent, cree_le desc);
create index fiches_liste_idx on public.fiches (compagnie_id, type, nom);
create index usage_ia_compagnie_mois_idx on public.usage_ia (compagnie_id, cree_le);

-- 12. Limite de coût mensuelle de Claude par compagnie ----------------------------
alter table public.compagnies add column limite_ia_usd numeric(10, 2) not null default 50;
