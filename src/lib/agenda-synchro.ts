import "server-only";
import { createClient } from "@/lib/supabase/server";
import { googlePret, jetonValide, lireEvenements, periode } from "@/lib/agenda";

// Synchro de MON agenda avec ma session (à l'ouverture de l'app). La sécurité de Supabase limite
// tout à mes propres données.
export async function synchroniserMonAgenda({ force = false } = {}) {
  if (!googlePret()) return { etat: "non_configure" as const };
  const supabase = await createClient();
  const { data: compte } = await supabase
    .from("google_comptes")
    .select("user_id, jeton_rafraichissement, jeton_acces, expire_le, derniere_synchro")
    .maybeSingle();
  if (!compte) return { etat: "non_connecte" as const };

  // Pas plus d'une fois aux 5 minutes (sauf si on force).
  if (!force && compte.derniere_synchro && Date.now() - new Date(compte.derniere_synchro).getTime() < 5 * 60_000) {
    return { etat: "a_jour" as const };
  }

  try {
    const { acces, nouveau } = await jetonValide(compte);
    const { debut, fin } = periode();
    const evenements = await lireEvenements(acces, debut, fin);

    if (evenements.length) {
      await supabase
        .from("evenements")
        .upsert(
          evenements.map((e) => ({ ...e, user_id: compte.user_id, maj_le: new Date().toISOString() })),
          { onConflict: "user_id,google_id" },
        );
    }
    // Copie locale : retire de la période ce qui a été supprimé dans Google.
    const ids = new Set(evenements.map((e) => e.google_id));
    const { data: locaux } = await supabase.from("evenements").select("google_id").gte("debut", debut).lt("debut", fin);
    const disparus = (locaux ?? []).map((l) => l.google_id).filter((id) => !ids.has(id));
    if (disparus.length) await supabase.from("evenements").delete().in("google_id", disparus);

    await supabase
      .from("google_comptes")
      .update({ derniere_synchro: new Date().toISOString(), ...(nouveau ?? {}) })
      .eq("user_id", compte.user_id);
    return { etat: "synchronise" as const, nombre: evenements.length };
  } catch (e) {
    console.error("Synchro de l'agenda :", e instanceof Error ? e.message : e);
    return { etat: "erreur" as const };
  }
}
