-- Accueil (Le Cerveau) : priorités du jour, alertes et conversation avec le Cerveau.

-- Les 3 priorités du jour, propres à chaque personne.
create table public.priorites (
  id uuid primary key default gen_random_uuid(),
  cree_par uuid not null default auth.uid() references auth.users (id),
  jour date not null,
  rang smallint not null check (rang between 1 and 3),
  texte text not null check (length(texte) between 1 and 300),
  faite boolean not null default false,
  cree_le timestamptz not null default now(),
  unique (cree_par, jour, rang)
);

alter table public.priorites enable row level security;
revoke all on public.priorites from anon;
grant select, insert, update, delete on public.priorites to authenticated;

create policy "Mes priorités : lire" on public.priorites
  for select to authenticated using (cree_par = (select auth.uid()));
create policy "Mes priorités : ajouter" on public.priorites
  for insert to authenticated with check (cree_par = (select auth.uid()));
create policy "Mes priorités : modifier" on public.priorites
  for update to authenticated
  using (cree_par = (select auth.uid())) with check (cree_par = (select auth.uid()));
create policy "Mes priorités : effacer" on public.priorites
  for delete to authenticated using (cree_par = (select auth.uid()));

-- Alertes envoyées par les agents (ex. stock bas, facture en retard).
create table public.alertes (
  id uuid primary key default gen_random_uuid(),
  agent text not null check (agent in (
    'cerveau', 'bras_droit', 'tresorier', 'agent_pub', 'studio',
    'creatif', 'acheteur', 'ecommerce', 'rh', 'partenariats'
  )),
  titre text not null,
  details text,
  niveau text not null default 'info' check (niveau in ('info', 'important', 'urgent')),
  cree_le timestamptz not null default now(),
  vue_le timestamptz,
  vue_par uuid references auth.users (id)
);

create index alertes_non_vues_idx on public.alertes (cree_le desc) where vue_le is null;

alter table public.alertes enable row level security;
revoke all on public.alertes from anon;
grant select, insert, update on public.alertes to authenticated;

create policy "Connectés : lire les alertes" on public.alertes
  for select to authenticated using (true);
create policy "Connectés : ajouter une alerte" on public.alertes
  for insert to authenticated with check (true);
create policy "Connectés : marquer vue" on public.alertes
  for update to authenticated using (true) with check (true);

-- Historique de la conversation avec le Cerveau, propre à chaque personne.
create table public.messages_cerveau (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  role text not null check (role in ('user', 'assistant')),
  contenu text not null,
  cree_le timestamptz not null default now()
);

create index messages_cerveau_user_idx on public.messages_cerveau (user_id, cree_le desc);

alter table public.messages_cerveau enable row level security;
revoke all on public.messages_cerveau from anon;
grant select, insert on public.messages_cerveau to authenticated;

create policy "Mes messages : lire" on public.messages_cerveau
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Mes messages : ajouter" on public.messages_cerveau
  for insert to authenticated with check (user_id = (select auth.uid()));
