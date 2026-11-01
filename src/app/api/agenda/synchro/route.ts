import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { googlePret, jetonValide, lireEvenements, periode } from "@/lib/agenda";

// Synchro planifiée (toutes les 15 minutes, lancée par Supabase). Sans session : le jeton reçu est
// vérifié par Supabase (empreinte) dans chaque fonction appelée. Lecture seule de Google.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const jeton = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!jeton) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  if (!googlePret()) return NextResponse.json({ erreur: "Google non configuré" }, { status: 503 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: comptes, error } = await supabase.rpc("agenda_comptes", { p_jeton: jeton });
  if (error) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });

  const { debut, fin } = periode();
  let ok = 0;
  for (const c of (comptes ?? []) as {
    user_id: string;
    jeton_rafraichissement: string;
    jeton_acces: string | null;
    expire_le: string | null;
  }[]) {
    try {
      const { acces, nouveau } = await jetonValide(c);
      const evenements = await lireEvenements(acces, debut, fin);
      await supabase.rpc("agenda_enregistrer", {
        p_jeton: jeton,
        p_user: c.user_id,
        p_debut: debut,
        p_fin: fin,
        p_evenements: evenements,
        p_jeton_acces: nouveau?.jeton_acces ?? null,
        p_expire_le: nouveau?.expire_le ?? null,
      });
      ok++;
    } catch (e) {
      console.error("Synchro planifiée :", e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json({ comptes: ok });
}
