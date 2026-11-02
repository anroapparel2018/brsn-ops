-- Ajustements multi-compagnies (testés sur la base de TEST ; à appliquer en prod après approbation).

-- Priorités : 3 par jour, par personne ET par compagnie.
alter table public.priorites drop constraint if exists priorites_cree_par_jour_rang_key;
alter table public.priorites add constraint priorites_compagnie_personne_jour_rang_key unique (compagnie_id, cree_par, jour, rang);

-- Rappels du matin : chaque appareil reçoit seulement les rappels et événements de SA personne.
create or replace function public.rappels_du_jour(secret text, debut timestamptz, fin timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.secret_valide('cron', secret) then raise exception 'Accès refusé'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'abonnement', jsonb_build_object('endpoint', a.endpoint, 'abonnement', a.abonnement),
      'rappels', coalesce((
        select jsonb_agg(jsonb_build_object('titre', t.titre, 'rappel_le', t.rappel_le) order by t.rappel_le)
        from public.taches t
        where t.user_id = a.user_id and t.statut = 'a_faire' and t.rappel_le between debut and fin
      ), '[]'::jsonb),
      'evenements', coalesce((
        select jsonb_agg(jsonb_build_object('titre', e.titre, 'debut', e.debut, 'journee_entiere', e.journee_entiere) order by e.debut)
        from public.evenements e
        where e.user_id = a.user_id
          and (e.debut between debut and fin or (e.journee_entiere and e.debut <= fin and e.fin > debut))
      ), '[]'::jsonb)
    ))
    from public.push_abonnements a
  ), '[]'::jsonb);
end;
$$;
