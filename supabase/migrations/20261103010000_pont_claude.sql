-- Pont avec Claude (serveur MCP de l'app). Migration additive.
-- Claude appelle /api/mcp avec un jeton personnel ; l'app transmet l'appel à pont_appel(), qui vérifie
-- l'empreinte du jeton, l'appartenance à la compagnie, fait l'action et l'inscrit au journal.

-- Jetons personnels (seule l'empreinte SHA-256 est gardée ; le jeton est montré une seule fois).
create table public.jetons_claude (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  nom text not null default 'Claude' check (length(nom) between 1 and 80),
  empreinte text not null unique,
  apercu text not null, -- les 4 derniers caractères, pour reconnaître le jeton
  cree_le timestamptz not null default now(),
  dernier_usage_le timestamptz,
  revoque_le timestamptz
);
create index jetons_claude_user_idx on public.jetons_claude (user_id);
alter table public.jetons_claude enable row level security;
revoke all on public.jetons_claude from anon;
grant select, insert on public.jetons_claude to authenticated;
grant update (revoque_le) on public.jetons_claude to authenticated;
create policy "Mes jetons : voir" on public.jetons_claude for select to authenticated using (user_id = (select auth.uid()));
create policy "Mes jetons : créer" on public.jetons_claude for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Mes jetons : révoquer" on public.jetons_claude for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Journal de chaque appel du pont (réussi ou refusé). Chaque création y devient une « carte ».
create table public.journal_pont (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id),
  jeton_id uuid references public.jetons_claude (id),
  compagnie_id uuid references public.compagnies (id),
  outil text not null,
  arguments jsonb,
  ok boolean not null,
  erreur text,
  type text, -- tache, rappel, approbation, note, decision
  agent text,
  titre text,
  ref_id uuid,
  cree_le timestamptz not null default now()
);
create index journal_pont_user_idx on public.journal_pont (user_id, cree_le desc);
create index journal_pont_cartes_idx on public.journal_pont (compagnie_id, cree_le desc) where ref_id is not null;
alter table public.journal_pont enable row level security;
revoke all on public.journal_pont from anon;
grant select on public.journal_pont to authenticated;
create policy "Mon journal du pont" on public.journal_pont for select to authenticated using (user_id = (select auth.uid()));

-- Provenance « claude » et classement.
alter table public.taches drop constraint taches_source_check;
alter table public.taches add constraint taches_source_check check (source in ('manuel', 'cerveau', 'note', 'systeme', 'claude'));
alter table public.notes drop constraint notes_source_check;
alter table public.notes add constraint notes_source_check check (source in ('texte', 'vocal', 'claude'));
alter table public.notes add column agent text;
alter table public.notes add column type text not null default 'note' check (type in ('note', 'decision'));
alter table public.approbations add column source text not null default 'app' check (source in ('app', 'claude'));

-- L'appel du pont. Appelable sans session (route /api/mcp) : protégé par le jeton.
create or replace function public.pont_appel(p_jeton text, p_outil text, p_args jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jetons_claude;
  a jsonb := coalesce(p_args, '{}'::jsonb);
  v_comp public.compagnies;
  v_agent text;
  v_id uuid;
  v_titre text;
  v_type text;
  v_res jsonb;
  v_quand timestamptz;
  v_jour date := (now() at time zone 'America/Toronto')::date;
  v_debut timestamptz;
  v_fin timestamptz;
begin
  select * into j from public.jetons_claude
  where empreinte = encode(extensions.digest(coalesce(p_jeton, ''), 'sha256'), 'hex') and revoque_le is null;
  if not found then
    raise exception 'Jeton invalide ou révoqué' using errcode = '28000';
  end if;
  update public.jetons_claude set dernier_usage_le = now() where id = j.id;

  begin
    -- Compagnie : slug ou nom, sinon ANRO (ou la première compagnie de la personne).
    if p_outil <> 'lister_organisations' then
      select c.* into v_comp from public.compagnies c
      where c.statut = 'active'
        and (exists (select 1 from public.membres m where m.compagnie_id = c.id and m.user_id = j.user_id and m.actif and m.role <> 'client')
             or exists (select 1 from public.super_admins s where s.user_id = j.user_id))
        and (nullif(trim(a->>'compagnie'), '') is null
             or lower(c.slug) = lower(trim(a->>'compagnie')) or lower(c.nom) = lower(trim(a->>'compagnie')))
      order by (c.slug = 'anro') desc, c.cree_le
      limit 1;
      if not found then
        raise exception 'Compagnie introuvable ou accès refusé : %', coalesce(a->>'compagnie', '(aucune)');
      end if;

      -- Agent : clé ou nom d'un agent de cette compagnie (par défaut, le Cerveau).
      if nullif(trim(a->>'agent'), '') is not null then
        select ag.cle into v_agent from public.agents ag
        where ag.compagnie_id = v_comp.id and ag.actif
          and (lower(ag.cle) = lower(trim(a->>'agent')) or lower(ag.nom) = lower(trim(a->>'agent')))
        limit 1;
        if v_agent is null then raise exception 'Agent inconnu dans %: %', v_comp.nom, a->>'agent'; end if;
      else
        v_agent := 'cerveau';
      end if;
    end if;

    case p_outil
    when 'lister_organisations' then
      select coalesce(jsonb_agg(jsonb_build_object('compagnie', c.slug, 'nom', c.nom,
        'role', coalesce(m.role, 'super_admin')) order by c.nom), '[]'::jsonb) into v_res
      from public.compagnies c
      left join public.membres m on m.compagnie_id = c.id and m.user_id = j.user_id and m.actif
      where c.statut = 'active'
        and ((m.user_id is not null and m.role <> 'client') or exists (select 1 from public.super_admins s where s.user_id = j.user_id));

    when 'lister_agents' then
      select coalesce(jsonb_agg(jsonb_build_object('agent', ag.cle, 'nom', ag.nom, 'role', ag.role) order by ag.ordre), '[]'::jsonb)
      into v_res from public.agents ag where ag.compagnie_id = v_comp.id and ag.actif;
      v_res := jsonb_build_object('compagnie', v_comp.nom, 'agents', v_res);

    when 'creer_tache', 'creer_rappel' then
      v_titre := left(trim(coalesce(a->>'titre', '')), 500);
      if v_titre = '' then raise exception 'Le titre est obligatoire.'; end if;
      v_quand := nullif(a->>'rappel_le', '')::timestamptz;
      if p_outil = 'creer_rappel' and v_quand is null then raise exception 'rappel_le (date et heure) est obligatoire.'; end if;
      v_type := case when p_outil = 'creer_rappel' then 'rappel' else 'tache' end;
      insert into public.taches (compagnie_id, user_id, titre, details, agent, categorie, echeance, rappel_le, recurrence, source)
      values (v_comp.id, j.user_id, v_titre, nullif(left(a->>'details', 5000), ''), v_agent,
        coalesce(nullif(a->>'categorie', ''), case
          when v_quand is not null and (v_quand at time zone 'America/Toronto')::date <= v_jour then 'aujourdhui'
          when v_quand is not null and (v_quand at time zone 'America/Toronto')::date <= v_jour + 7 then 'semaine'
          when nullif(a->>'echeance', '')::date <= v_jour then 'aujourdhui'
          when nullif(a->>'echeance', '')::date <= v_jour + 7 then 'semaine'
          else 'plus_tard' end),
        nullif(a->>'echeance', '')::date, v_quand, nullif(a->>'recurrence', ''), 'claude')
      returning id into v_id;

    when 'creer_approbation' then
      v_titre := left(trim(coalesce(a->>'titre', '')), 500);
      if v_titre = '' then raise exception 'Le titre est obligatoire.'; end if;
      v_type := 'approbation';
      insert into public.approbations (compagnie_id, agent, titre, details, type, source)
      values (v_comp.id, v_agent, v_titre, nullif(left(a->>'details', 10000), ''), coalesce(nullif(a->>'type', ''), 'autre'), 'claude')
      returning id into v_id;

    when 'creer_note', 'creer_decision' then
      v_titre := left(trim(coalesce(a->>'contenu', a->>'titre', '')), 5000);
      if v_titre = '' then raise exception 'Le contenu est obligatoire.'; end if;
      v_type := case when p_outil = 'creer_decision' then 'decision' else 'note' end;
      insert into public.notes (compagnie_id, user_id, contenu, source, agent, type, statut)
      values (v_comp.id, j.user_id, v_titre, 'claude', v_agent, v_type, case when v_type = 'decision' then 'classee' else 'nouvelle' end)
      returning id into v_id;

    when 'lister_en_attente' then
      v_res := jsonb_build_object(
        'compagnie', v_comp.nom,
        'approbations', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'titre', x.titre, 'agent', x.agent,
            'type', x.type, 'depuis', x.cree_le) order by x.cree_le), '[]'::jsonb)
          from public.approbations x where x.compagnie_id = v_comp.id and x.statut = 'en_attente'),
        'taches', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'titre', t.titre, 'agent', t.agent,
            'categorie', t.categorie, 'echeance', t.echeance, 'rappel_le', t.rappel_le) order by t.categorie, t.cree_le), '[]'::jsonb)
          from (select * from public.taches where compagnie_id = v_comp.id and user_id = j.user_id and statut = 'a_faire'
                and (a->>'agent' is null or agent = v_agent) order by cree_le desc limit 100) t),
        'notes_a_classer', (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'contenu', left(n.contenu, 300))), '[]'::jsonb)
          from public.notes n where n.compagnie_id = v_comp.id and n.user_id = j.user_id and n.statut = 'nouvelle'));

    when 'mettre_a_jour_statut' then
      v_id := nullif(a->>'id', '')::uuid;
      if v_id is null then raise exception 'id obligatoire.'; end if;
      if a->>'type' = 'tache' and a->>'statut' in ('a_faire', 'fait') then
        update public.taches set statut = a->>'statut', fait_le = case when a->>'statut' = 'fait' then now() end, maj_le = now()
        where id = v_id and compagnie_id = v_comp.id and user_id = j.user_id returning titre into v_titre;
      elsif a->>'type' = 'note' and a->>'statut' in ('nouvelle', 'classee') then
        update public.notes set statut = a->>'statut', maj_le = now()
        where id = v_id and compagnie_id = v_comp.id and user_id = j.user_id returning left(contenu, 200) into v_titre;
      elsif a->>'type' = 'approbation' then
        raise exception 'Une approbation se décide seulement dans l''app BRSN OPS (Approbations).';
      else
        raise exception 'Type ou statut non permis. tache : a_faire ou fait ; note : nouvelle ou classee.';
      end if;
      if v_titre is null then raise exception 'Élément introuvable dans %.', v_comp.nom; end if;
      v_res := jsonb_build_object('id', v_id, 'statut', a->>'statut', 'titre', v_titre);
      v_id := null; -- pas une nouvelle carte

    when 'resume_du_jour' then
      v_debut := (v_jour::timestamp at time zone 'America/Toronto');
      v_fin := v_debut + interval '1 day';
      v_res := jsonb_build_object(
        'date', v_jour,
        'compagnie', v_comp.nom,
        'approbations_en_attente', (select count(*) from public.approbations where compagnie_id = v_comp.id and statut = 'en_attente'),
        'urgent_et_aujourdhui', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'titre', t.titre, 'agent', t.agent, 'categorie', t.categorie)), '[]'::jsonb)
          from public.taches t where t.compagnie_id = v_comp.id and t.user_id = j.user_id and t.statut = 'a_faire'
            and (t.categorie in ('urgent', 'aujourdhui') or t.echeance <= v_jour)),
        'rappels_du_jour', (select coalesce(jsonb_agg(jsonb_build_object('titre', t.titre, 'heure', to_char(t.rappel_le at time zone 'America/Toronto', 'HH24:MI')) order by t.rappel_le), '[]'::jsonb)
          from public.taches t where t.compagnie_id = v_comp.id and t.user_id = j.user_id and t.statut = 'a_faire' and t.rappel_le < v_fin),
        'agenda', (select coalesce(jsonb_agg(jsonb_build_object('titre', e.titre,
            'heure', case when e.journee_entiere then 'journée' else to_char(e.debut at time zone 'America/Toronto', 'HH24:MI') end) order by e.debut), '[]'::jsonb)
          from public.evenements e where e.user_id = j.user_id and e.debut < v_fin and e.fin > v_debut),
        'taches_a_faire', (select count(*) from public.taches where compagnie_id = v_comp.id and user_id = j.user_id and statut = 'a_faire'));

    else
      raise exception 'Outil inconnu : %', p_outil;
    end case;

    if v_id is not null then
      v_res := jsonb_build_object('id', v_id, 'type', v_type, 'compagnie', v_comp.nom, 'agent', v_agent, 'titre', left(v_titre, 200),
        'statut', case v_type when 'approbation' then 'en_attente' when 'decision' then 'classee' when 'note' then 'nouvelle' else 'a_faire' end,
        'message', 'Créé dans BRSN OPS. Visible dans l''app.');
    end if;

    insert into public.journal_pont (user_id, jeton_id, compagnie_id, outil, arguments, ok, type, agent, titre, ref_id)
    values (j.user_id, j.id, v_comp.id, p_outil, a, true, v_type, v_agent, left(v_titre, 200), v_id);
    return jsonb_build_object('ok', true, 'resultat', v_res);
  exception when others then
    insert into public.journal_pont (user_id, jeton_id, compagnie_id, outil, arguments, ok, erreur)
    values (j.user_id, j.id, v_comp.id, p_outil, a, false, left(sqlerrm, 500));
    return jsonb_build_object('ok', false, 'erreur', sqlerrm);
  end;
end;
$$;
revoke all on function public.pont_appel(text, text, jsonb) from public;
grant execute on function public.pont_appel(text, text, jsonb) to anon, authenticated;

-- Vérifie seulement un jeton (sans rien écrire au journal), pour refuser tôt un appel sans accès.
create or replace function public.pont_verifier(p_jeton text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.jetons_claude
    where empreinte = encode(extensions.digest(coalesce(p_jeton, ''), 'sha256'), 'hex') and revoque_le is null)
$$;
revoke all on function public.pont_verifier(text) from public;
grant execute on function public.pont_verifier(text) to anon, authenticated;
