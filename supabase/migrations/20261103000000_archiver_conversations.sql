-- Les discussions avec les agents sont retirées de l'app (on parle maintenant directement dans Claude).
-- Rien n'est supprimé : la table reste, en lecture seule, marquée comme archive.
alter table public.messages_agents add column if not exists archive_le timestamptz;
update public.messages_agents set archive_le = now() where archive_le is null;
revoke insert, update, delete on public.messages_agents from authenticated;
comment on table public.messages_agents is 'ARCHIVE (2026-11-02) : anciennes discussions avec les agents, en lecture seule.';
