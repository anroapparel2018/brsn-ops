-- Tests automatiques de la matrice des droits (à lancer sur la base de TEST seulement).
-- Chaque ligne de résultat : test, attendu, obtenu, ok. Tout doit être « ok = true ».
-- Utilisation : exécuter tout le fichier ; il se termine par un ROLLBACK (rien n'est gardé).

begin;

-- Personnes de test
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'super@test.local', '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-anro@test.local', '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'employe-anro@test.local', '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client-anro@test.local', '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'employe-wide@test.local', '{}', '{}', now(), now());

insert into public.super_admins (user_id) values ('00000000-0000-0000-0000-0000000000a1');
insert into public.membres (compagnie_id, user_id, role)
select id, '00000000-0000-0000-0000-0000000000a2', 'admin' from public.compagnies where slug = 'anro'
union all select id, '00000000-0000-0000-0000-0000000000a3', 'employe' from public.compagnies where slug = 'anro'
union all select id, '00000000-0000-0000-0000-0000000000a4', 'client' from public.compagnies where slug = 'anro'
union all select id, '00000000-0000-0000-0000-0000000000a5', 'employe' from public.compagnies where slug = 'wide-the-brand';

-- Données de départ
insert into public.approbations (compagnie_id, agent, titre, partage_client)
select id, 'agent_pub', 'Pub ANRO interne', false from public.compagnies where slug = 'anro'
union all select id, 'agent_pub', 'Pub ANRO partagée au client', true from public.compagnies where slug = 'anro'
union all select id, 'agent_pub', 'Pub Wide', false from public.compagnies where slug = 'wide-the-brand';
insert into public.taches (compagnie_id, user_id, titre)
select id, '00000000-0000-0000-0000-0000000000a3', 'Tâche employé ANRO' from public.compagnies where slug = 'anro'
union all select id, '00000000-0000-0000-0000-0000000000a5', 'Tâche employé Wide' from public.compagnies where slug = 'wide-the-brand';
insert into public.fiches (compagnie_id, type, nom)
select id, 'fournisseur', 'Fournisseur ANRO' from public.compagnies where slug = 'anro'
union all select id, 'fournisseur', 'Fournisseur Wide' from public.compagnies where slug = 'wide-the-brand';

create temp table resultats (test text, attendu text, obtenu text, ok boolean) on commit drop;
grant all on resultats to authenticated;

create or replace function pg_temp.comme(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.noter(p_test text, p_attendu text, p_obtenu text) returns void language sql as $$
  insert into resultats values (p_test, p_attendu, p_obtenu, p_attendu = p_obtenu)
$$;

-- Lectures --------------------------------------------------------------------
select pg_temp.comme('00000000-0000-0000-0000-0000000000a1');
select pg_temp.noter('super_admin voit toutes les approbations', '3', (select count(*)::text from public.approbations));
select pg_temp.noter('super_admin voit les 7 compagnies', '7', (select count(*)::text from public.compagnies));
reset role;

select pg_temp.comme('00000000-0000-0000-0000-0000000000a2');
select pg_temp.noter('admin ANRO voit les approbations ANRO seulement', '2', (select count(*)::text from public.approbations));
select pg_temp.noter('admin ANRO ne voit pas Wide', '0', (select count(*)::text from public.approbations where titre = 'Pub Wide'));
select pg_temp.noter('admin ANRO voit 1 compagnie', '1', (select count(*)::text from public.compagnies));
select pg_temp.noter('admin ANRO voit les membres ANRO', '3', (select count(*)::text from public.membres));
select pg_temp.noter('admin ANRO ne voit pas la tâche personnelle de l''employé', '0', (select count(*)::text from public.taches));
reset role;

select pg_temp.comme('00000000-0000-0000-0000-0000000000a3');
select pg_temp.noter('employé ANRO voit les approbations ANRO', '2', (select count(*)::text from public.approbations));
select pg_temp.noter('employé ANRO voit sa tâche', '1', (select count(*)::text from public.taches));
select pg_temp.noter('employé ANRO voit seulement les fiches ANRO', 'Fournisseur ANRO', (select string_agg(nom, ',') from public.fiches));
select pg_temp.noter('employé ANRO ne voit que sa propre fiche de membre', '1', (select count(*)::text from public.membres));
reset role;

select pg_temp.comme('00000000-0000-0000-0000-0000000000a4');
select pg_temp.noter('client ANRO voit seulement ce qui est partagé', 'Pub ANRO partagée au client', (select string_agg(titre, ',') from public.approbations));
select pg_temp.noter('client ANRO ne voit aucune fiche', '0', (select count(*)::text from public.fiches));
select pg_temp.noter('client ANRO ne voit aucune tâche', '0', (select count(*)::text from public.taches));
reset role;

select pg_temp.comme('00000000-0000-0000-0000-0000000000a5');
select pg_temp.noter('employé Wide ne voit que Wide', 'Pub Wide', (select string_agg(titre, ',') from public.approbations));
select pg_temp.noter('employé Wide ne voit pas les fiches ANRO', 'Fournisseur Wide', (select string_agg(nom, ',') from public.fiches));
reset role;

-- Écritures -------------------------------------------------------------------
do $$
declare anro uuid := (select id from public.compagnies where slug = 'anro'); ok boolean;
begin
  perform pg_temp.comme('00000000-0000-0000-0000-0000000000a5');
  begin
    insert into public.fiches (compagnie_id, type, nom) values (anro, 'fournisseur', 'Intrus');
    ok := false;
  exception when others then ok := true;
  end;
  reset role;
  perform pg_temp.noter('employé Wide ne peut pas écrire chez ANRO', 'true', ok::text);

  perform pg_temp.comme('00000000-0000-0000-0000-0000000000a5');
  update public.approbations set statut = 'approuve' where titre = 'Pub ANRO interne';
  reset role;
  perform pg_temp.noter('employé Wide ne peut pas approuver chez ANRO', 'en_attente',
    (select statut from public.approbations where titre = 'Pub ANRO interne'));

  perform pg_temp.comme('00000000-0000-0000-0000-0000000000a4');
  update public.approbations set statut = 'approuve' where titre = 'Pub ANRO interne';
  update public.approbations set statut = 'a_changer', commentaire = 'Plus gros logo' where titre = 'Pub ANRO partagée au client';
  reset role;
  perform pg_temp.noter('client ne peut pas approuver ce qui n''est pas partagé', 'en_attente',
    (select statut from public.approbations where titre = 'Pub ANRO interne'));
  perform pg_temp.noter('client peut demander un changement sur ce qui est partagé', 'a_changer',
    (select statut from public.approbations where titre = 'Pub ANRO partagée au client'));

  perform pg_temp.comme('00000000-0000-0000-0000-0000000000a3');
  begin
    insert into public.membres (compagnie_id, user_id, role) values (anro, '00000000-0000-0000-0000-0000000000a5', 'admin');
    ok := false;
  exception when others then ok := true;
  end;
  reset role;
  perform pg_temp.noter('employé ne peut pas ajouter de membre', 'true', ok::text);

  perform pg_temp.comme('00000000-0000-0000-0000-0000000000a2');
  begin
    insert into public.compagnies (slug, nom) values ('pirate', 'Pirate');
    ok := false;
  exception when others then ok := true;
  end;
  reset role;
  perform pg_temp.noter('admin de compagnie ne peut pas créer de compagnie', 'true', ok::text);

  perform pg_temp.comme('00000000-0000-0000-0000-0000000000a1');
  insert into public.compagnies (slug, nom) values ('test-cree', 'Compagnie test');
  reset role;
  perform pg_temp.noter('super_admin peut créer une compagnie', '1', (select count(*)::text from public.compagnies where slug = 'test-cree'));

  perform pg_temp.comme('00000000-0000-0000-0000-0000000000a2');
  insert into public.membres (compagnie_id, user_id, role) values (anro, '00000000-0000-0000-0000-0000000000a5', 'employe');
  reset role;
  perform pg_temp.noter('admin ANRO peut ajouter un membre à ANRO', '1',
    (select count(*)::text from public.membres where compagnie_id = anro and user_id = '00000000-0000-0000-0000-0000000000a5'));
end $$;

select test, attendu, obtenu, ok from resultats order by ok, test;
rollback;
