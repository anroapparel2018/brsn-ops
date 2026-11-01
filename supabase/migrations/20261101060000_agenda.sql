-- Module Agenda : lecture seule de Google Agenda. Chaque personne ne voit que ses données.
-- Les jetons Google sont chiffrés par l'app (AES-256-GCM) avant d'arriver ici.

create table public.google_comptes (
  user_id uuid primary key default auth.uid() references auth.users (id),
  calendrier text,                       -- adresse de l'agenda principal
  jeton_rafraichissement text not null,  -- chiffré
  jeton_acces text,                      -- chiffré
  expire_le timestamptz,
  derniere_synchro timestamptz,
  cree_le timestamptz not null default now()
);

create table public.evenements (
  user_id uuid not null default auth.uid() references auth.users (id),
  google_id text not null,
  debut timestamptz not null,
  fin timestamptz not null,
  journee_entiere boolean not null default false,
  titre text not null default '(sans titre)',
  lieu text,
  meet text,
  description text,
  invites jsonb not null default '[]'::jsonb,
  lien_google text,
  categorie_auto text not null default 'autre',
  categorie text, -- choix de Julien (garde la priorité sur categorie_auto)
  maj_le timestamptz not null default now(),
  primary key (user_id, google_id)
);
create index evenements_periode_idx on public.evenements (user_id, debut);

do $$
declare t text;
begin
  foreach t in array array['google_comptes', 'evenements']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "Mes données seulement" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- Vérifie un secret interne par son empreinte (jamais le secret lui-même en clair).
create or replace function public.secret_valide(p_nom text, p_valeur text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.secrets_internes
    where nom = p_nom and empreinte = encode(extensions.digest(p_valeur, 'sha256'), 'hex')
  )
$$;
revoke all on function public.secret_valide(text, text) from public, anon, authenticated;

-- Synchro planifiée (sans session) : comptes à synchroniser. Jetons toujours chiffrés.
create or replace function public.agenda_comptes(p_jeton text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.secret_valide('agenda_cron', p_jeton) then raise exception 'Accès refusé'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', user_id, 'jeton_rafraichissement', jeton_rafraichissement,
      'jeton_acces', jeton_acces, 'expire_le', expire_le))
    from public.google_comptes
  ), '[]'::jsonb);
end;
$$;

-- Synchro planifiée : enregistre les événements d'une période pour une personne.
create or replace function public.agenda_enregistrer(
  p_jeton text, p_user uuid, p_debut timestamptz, p_fin timestamptz, p_evenements jsonb,
  p_jeton_acces text, p_expire_le timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  if not public.secret_valide('agenda_cron', p_jeton) then raise exception 'Accès refusé'; end if;

  insert into public.evenements as e (user_id, google_id, debut, fin, journee_entiere, titre, lieu, meet,
    description, invites, lien_google, categorie_auto, maj_le)
  select p_user, x.google_id, x.debut, x.fin, x.journee_entiere, x.titre, x.lieu, x.meet,
    x.description, coalesce(x.invites, '[]'::jsonb), x.lien_google, x.categorie_auto, now()
  from jsonb_to_recordset(p_evenements) as x(google_id text, debut timestamptz, fin timestamptz,
    journee_entiere boolean, titre text, lieu text, meet text, description text, invites jsonb,
    lien_google text, categorie_auto text)
  on conflict (user_id, google_id) do update set
    debut = excluded.debut, fin = excluded.fin, journee_entiere = excluded.journee_entiere,
    titre = excluded.titre, lieu = excluded.lieu, meet = excluded.meet, description = excluded.description,
    invites = excluded.invites, lien_google = excluded.lien_google,
    categorie_auto = excluded.categorie_auto, maj_le = now();
  get diagnostics n = row_count;

  -- Copie locale seulement : retire de la période les événements supprimés dans Google.
  delete from public.evenements
  where user_id = p_user and debut >= p_debut and debut < p_fin
    and google_id not in (select x.google_id from jsonb_to_recordset(p_evenements) as x(google_id text));

  update public.google_comptes set derniere_synchro = now(),
    jeton_acces = coalesce(p_jeton_acces, jeton_acces), expire_le = coalesce(p_expire_le, expire_le)
  where user_id = p_user;
  return n;
end;
$$;

revoke all on function public.agenda_comptes(text) from public, authenticated;
revoke all on function public.agenda_enregistrer(text, uuid, timestamptz, timestamptz, jsonb, text, timestamptz) from public, authenticated;
grant execute on function public.agenda_comptes(text) to anon;
grant execute on function public.agenda_enregistrer(text, uuid, timestamptz, timestamptz, jsonb, text, timestamptz) to anon;

-- Rappels du matin : on ajoute les événements du jour.
create or replace function public.rappels_du_jour(secret text, debut timestamptz, fin timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.secret_valide('cron', secret) then raise exception 'Accès refusé'; end if;

  return jsonb_build_object(
    'rappels', coalesce((
      select jsonb_agg(jsonb_build_object('titre', t.titre, 'rappel_le', t.rappel_le) order by t.rappel_le)
      from public.taches t
      where t.statut = 'a_faire' and t.rappel_le between debut and fin
    ), '[]'::jsonb),
    'evenements', coalesce((
      select jsonb_agg(jsonb_build_object('titre', e.titre, 'debut', e.debut, 'journee_entiere', e.journee_entiere) order by e.debut)
      from public.evenements e
      where e.debut between debut and fin or (e.journee_entiere and e.debut <= fin and e.fin > debut)
    ), '[]'::jsonb),
    'abonnements', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', a.endpoint, 'abonnement', a.abonnement))
      from public.push_abonnements a
    ), '[]'::jsonb)
  );
end;
$$;
