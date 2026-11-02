-- Tests du pont avec Claude (à lancer sur la base de TEST). Se termine par un ROLLBACK : rien n'est gardé.
-- Chaque ligne : test, ok. Tout doit être « ok = true ».

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pont-anro@test.local', '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pont-wide@test.local', '{}', '{}', now(), now());
insert into public.membres (compagnie_id, user_id, role)
select id, '00000000-0000-0000-0000-0000000000b1'::uuid, 'employe' from public.compagnies where slug = 'anro'
union all select id, '00000000-0000-0000-0000-0000000000b2'::uuid, 'employe' from public.compagnies where slug = 'wide-the-brand';
insert into public.jetons_claude (user_id, empreinte, apercu) values
  ('00000000-0000-0000-0000-0000000000b1', encode(extensions.digest('jeton-anro', 'sha256'), 'hex'), 'anro'),
  ('00000000-0000-0000-0000-0000000000b2', encode(extensions.digest('jeton-wide', 'sha256'), 'hex'), 'wide');
insert into public.jetons_claude (user_id, empreinte, apercu, revoque_le) values
  ('00000000-0000-0000-0000-0000000000b1', encode(extensions.digest('jeton-revoque', 'sha256'), 'hex'), 'revo', now());

create temp table r (test text, ok boolean) on commit drop;

create or replace function pg_temp.refuse(p_jeton text) returns boolean language plpgsql as $$
begin
  perform public.pont_appel(p_jeton, 'lister_organisations', '{}');
  return false;
exception when others then
  return sqlerrm like 'Jeton invalide%';
end $$;

-- Appels valides
insert into r select 'liste ses compagnies (ANRO seulement)',
  (public.pont_appel('jeton-anro', 'lister_organisations', '{}')->'resultat') = '[{"compagnie":"anro","nom":"ANRO Apparel","role":"employe"}]'::jsonb;
insert into r select 'liste les agents de ANRO', jsonb_array_length(public.pont_appel('jeton-anro', 'lister_agents', '{}')->'resultat'->'agents') = 10;
insert into r select 'crée une tâche', (public.pont_appel('jeton-anro', 'creer_tache', '{"titre":"Appeler Fortee","agent":"acheteur","echeance":"2099-01-01"}')->>'ok')::boolean;
insert into r select 'la tâche est dans ANRO, source claude, agent acheteur',
  exists (select 1 from public.taches t join public.compagnies c on c.id = t.compagnie_id
    where t.titre = 'Appeler Fortee' and c.slug = 'anro' and t.source = 'claude' and t.agent = 'acheteur'
      and t.user_id = '00000000-0000-0000-0000-0000000000b1' and t.categorie = 'plus_tard');
-- (Un appel et sa vérification vont dans deux requêtes : une même requête ne voit pas ses propres ajouts.)
insert into r select 'crée un rappel', (public.pont_appel('jeton-anro', 'creer_rappel', jsonb_build_object('titre', 'Payer hoodies', 'rappel_le', now() + interval '1 hour'))->'resultat'->>'statut') = 'a_faire';
insert into r select 'le rappel est classé aujourd''hui ou cette semaine', exists (select 1 from public.taches where titre = 'Payer hoodies' and rappel_le is not null and categorie in ('aujourdhui', 'semaine'));
insert into r select 'crée une approbation en attente', (public.pont_appel('jeton-anro', 'creer_approbation', '{"titre":"Pub Black Friday","agent":"Agent Pub","type":"pub"}')->'resultat'->>'statut') = 'en_attente';
insert into r select 'crée une note', (public.pont_appel('jeton-anro', 'creer_note', '{"contenu":"Idée de vidéo"}')->>'ok')::boolean;
insert into r select 'crée une décision', (public.pont_appel('jeton-anro', 'creer_decision', '{"contenu":"On garde Fortee"}')->>'ok')::boolean;
insert into r select 'la décision est classée comme décision', exists (select 1 from public.notes where contenu = 'On garde Fortee' and type = 'decision');
insert into r select 'liste ce qui attend', jsonb_array_length(public.pont_appel('jeton-anro', 'lister_en_attente', '{}')->'resultat'->'approbations') >= 1;
insert into r select 'marque une tâche faite',
  (public.pont_appel('jeton-anro', 'mettre_a_jour_statut', jsonb_build_object('type', 'tache', 'statut', 'fait',
    'id', (select id from public.taches where titre = 'Appeler Fortee')))->>'ok')::boolean;
insert into r select 'la tâche est bien faite', exists (select 1 from public.taches where titre = 'Appeler Fortee' and statut = 'fait');
insert into r select 'résumé du jour', (public.pont_appel('jeton-anro', 'resume_du_jour', '{}')->'resultat'->>'compagnie') = 'ANRO Apparel';

-- Refus
insert into r select 'refusé sans jeton', pg_temp.refuse('');
insert into r select 'refusé avec un faux jeton', pg_temp.refuse('pas-un-jeton');
insert into r select 'refusé avec un jeton révoqué', pg_temp.refuse('jeton-revoque');
insert into r select 'refusé : approuver depuis Claude',
  not (public.pont_appel('jeton-anro', 'mettre_a_jour_statut', jsonb_build_object('type', 'approbation', 'statut', 'approuve',
    'id', (select id from public.approbations where titre = 'Pub Black Friday')))->>'ok')::boolean
  and exists (select 1 from public.approbations where titre = 'Pub Black Friday' and statut = 'en_attente');
insert into r select 'refusé : catégorie invalide', not (public.pont_appel('jeton-anro', 'creer_tache', '{"titre":"x","categorie":"nimporte"}')->>'ok')::boolean;
insert into r select 'refusé : outil inconnu', not (public.pont_appel('jeton-anro', 'supprimer_tout', '{}')->>'ok')::boolean;

-- Isolation entre compagnies
insert into r select 'ANRO ne peut pas écrire dans Wide', not (public.pont_appel('jeton-anro', 'creer_tache', '{"titre":"Intrus","compagnie":"wide-the-brand"}')->>'ok')::boolean
  and not exists (select 1 from public.taches where titre = 'Intrus');
insert into r select 'Wide ne voit pas les approbations ANRO',
  not (public.pont_appel('jeton-wide', 'lister_en_attente', '{"compagnie":"anro"}')->>'ok')::boolean
  and not exists (select 1 from jsonb_array_elements(public.pont_appel('jeton-wide', 'lister_en_attente', '{}')->'resultat'->'approbations') e
    where e->>'titre' = 'Pub Black Friday');
insert into r select 'Wide ne peut pas modifier une tâche ANRO',
  not (public.pont_appel('jeton-wide', 'mettre_a_jour_statut', jsonb_build_object('type', 'tache', 'statut', 'a_faire',
    'id', (select id from public.taches where titre = 'Appeler Fortee')))->>'ok')::boolean
  and exists (select 1 from public.taches where titre = 'Appeler Fortee' and statut = 'fait');

-- Journal
insert into r select 'chaque appel est au journal (réussis et refusés)',
  (select count(*) from public.journal_pont where user_id = '00000000-0000-0000-0000-0000000000b1' and ok) >= 9
  and (select count(*) from public.journal_pont where user_id = '00000000-0000-0000-0000-0000000000b1' and not ok) >= 3;
insert into r select 'les jetons ne sont gardés qu''en empreinte', not exists (select 1 from public.jetons_claude where empreinte like 'jeton-%');

select * from r;
rollback;
