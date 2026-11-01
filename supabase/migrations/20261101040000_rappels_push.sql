-- Notification du matin : la tâche planifiée de Vercel (sans session) lit les rappels du jour
-- grâce à une fonction protégée par un secret (seule l'empreinte SHA-256 du secret est gardée ici).

create table public.secrets_internes (
  nom text primary key,
  empreinte text not null
);
alter table public.secrets_internes enable row level security;
revoke all on public.secrets_internes from anon, authenticated;
-- Aucune règle d'accès : seule la fonction ci-dessous (security definer) peut la lire.

insert into public.secrets_internes (nom, empreinte)
values ('cron', 'db53b81a5689ac7ac9c674bd7cf020c2fbf259c4d050be9417776a5508050bca');

create or replace function public.rappels_du_jour(secret text, debut timestamptz, fin timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.secrets_internes
    where nom = 'cron' and empreinte = encode(extensions.digest(secret, 'sha256'), 'hex')
  ) then
    raise exception 'Accès refusé';
  end if;

  return jsonb_build_object(
    'rappels', coalesce((
      select jsonb_agg(jsonb_build_object('titre', t.titre, 'rappel_le', t.rappel_le) order by t.rappel_le)
      from public.taches t
      where t.statut = 'a_faire' and t.rappel_le between debut and fin
    ), '[]'::jsonb),
    'abonnements', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', a.endpoint, 'abonnement', a.abonnement))
      from public.push_abonnements a
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.rappels_du_jour(text, timestamptz, timestamptz) from public;
grant execute on function public.rappels_du_jour(text, timestamptz, timestamptz) to anon, authenticated;
