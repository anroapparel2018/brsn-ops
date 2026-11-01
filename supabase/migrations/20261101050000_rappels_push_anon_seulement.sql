-- Seule la tâche planifiée (clé publique + secret) appelle cette fonction.
revoke execute on function public.rappels_du_jour(text, timestamptz, timestamptz) from authenticated;
