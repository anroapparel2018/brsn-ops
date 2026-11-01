-- Demandes d'événements : rien n'est écrit dans Google Agenda sans l'approbation de Julien.
create table public.agenda_demandes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  titre text not null check (length(titre) between 1 and 300),
  debut timestamptz not null,
  fin timestamptz not null check (fin > debut),
  journee_entiere boolean not null default false,
  lieu text,
  invites text[] not null default '{}',
  meet boolean not null default false,
  categorie text not null default 'autre',
  description text,
  source text not null default 'manuel' check (source in ('manuel', 'cerveau')),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'cree', 'refuse', 'erreur')),
  google_id text,
  erreur text,
  cree_le timestamptz not null default now(),
  decide_le timestamptz
);
create index agenda_demandes_statut_idx on public.agenda_demandes (user_id, statut, debut);

alter table public.agenda_demandes enable row level security;
revoke all on public.agenda_demandes from anon;
grant select, insert, update on public.agenda_demandes to authenticated;
create policy "Mes demandes seulement" on public.agenda_demandes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Permission d'écriture accordée par Google (création d'événements), mise à jour à la connexion.
alter table public.google_comptes add column peut_ecrire boolean not null default false;

create or replace function public.google_finir_connexion(
  p_etat text, p_jeton_rafraichissement text, p_jeton_acces text, p_expire_le timestamptz,
  p_peut_ecrire boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid;
begin
  delete from public.google_etats
  where etat = p_etat and cree_le > now() - interval '15 minutes'
  returning user_id into v_user;
  if v_user is null then return false; end if;

  insert into public.google_comptes (user_id, jeton_rafraichissement, jeton_acces, expire_le, derniere_synchro, peut_ecrire)
  values (v_user, p_jeton_rafraichissement, p_jeton_acces, p_expire_le, null, p_peut_ecrire)
  on conflict (user_id) do update set
    jeton_rafraichissement = excluded.jeton_rafraichissement, jeton_acces = excluded.jeton_acces,
    expire_le = excluded.expire_le, derniere_synchro = null, peut_ecrire = excluded.peut_ecrire;
  return true;
end;
$$;
revoke all on function public.google_finir_connexion(text, text, text, timestamptz, boolean) from public, authenticated;
grant execute on function public.google_finir_connexion(text, text, text, timestamptz, boolean) to anon;
drop function public.google_finir_connexion(text, text, text, timestamptz);
