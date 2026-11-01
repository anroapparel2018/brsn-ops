-- Sur iPhone, la connexion Google s'ouvre dans Safari (sans la session de l'app installée).
-- Le retour de Google est donc relié à la personne par un « état » secret créé avant de partir.

create table public.google_etats (
  etat text primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  cree_le timestamptz not null default now()
);
alter table public.google_etats enable row level security;
revoke all on public.google_etats from anon;
grant insert on public.google_etats to authenticated;
create policy "Créer mon état de connexion" on public.google_etats
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Termine la connexion : l'état doit exister et dater de moins de 15 minutes. Jetons déjà chiffrés.
create or replace function public.google_finir_connexion(
  p_etat text, p_jeton_rafraichissement text, p_jeton_acces text, p_expire_le timestamptz
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

  insert into public.google_comptes (user_id, jeton_rafraichissement, jeton_acces, expire_le, derniere_synchro)
  values (v_user, p_jeton_rafraichissement, p_jeton_acces, p_expire_le, null)
  on conflict (user_id) do update set
    jeton_rafraichissement = excluded.jeton_rafraichissement, jeton_acces = excluded.jeton_acces,
    expire_le = excluded.expire_le, derniere_synchro = null;
  return true;
end;
$$;
revoke all on function public.google_finir_connexion(text, text, text, timestamptz) from public, authenticated;
grant execute on function public.google_finir_connexion(text, text, text, timestamptz) to anon;
