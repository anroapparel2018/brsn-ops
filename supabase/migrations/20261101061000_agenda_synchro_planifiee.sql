-- Synchro de l'agenda toutes les 15 minutes : Supabase appelle l'app (le forfait gratuit de Vercel
-- ne permet qu'une tâche planifiée par jour). Le jeton est créé ici, gardé dans le coffre (Vault),
-- et seule son empreinte sert à le vérifier : personne ne le voit.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'agenda_cron', 'Jeton de la synchro de l''agenda');

insert into public.secrets_internes (nom, empreinte)
select 'agenda_cron', encode(extensions.digest(decrypted_secret, 'sha256'), 'hex')
from vault.decrypted_secrets where name = 'agenda_cron';

select cron.schedule(
  'synchro-agenda',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://brsn-ops.vercel.app/api/agenda/synchro',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'agenda_cron')
    ),
    timeout_milliseconds := 30000
  );
  $$
);
