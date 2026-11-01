import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chiffrer, echangerCode, PORTEE, PORTEE_ECRITURE } from "@/lib/agenda";

// Retour de Google. Peut arriver dans Safari, sans la session de l'app : la personne est retrouvée
// grâce à l'« état » secret créé avant de partir. Les jetons sont chiffrés avant d'être gardés.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const vers = (resultat: string) => NextResponse.redirect(new URL(`/google-branche?resultat=${resultat}`, req.url));

  const etat = p.get("state");
  if (!etat) return vers("securite");
  if (p.get("error") || !p.get("code")) return vers("refus");

  try {
    const j = await echangerCode(p.get("code")!, req.nextUrl.origin);
    if (!j.refresh_token) return vers("jeton");
    const portees = (j.scope ?? "").split(" ");
    const peutEcrire = portees.includes(PORTEE_ECRITURE);
    if (j.scope && !portees.includes(PORTEE) && !peutEcrire) return vers("permission");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { data: ok, error } = await supabase.rpc("google_finir_connexion", {
      p_etat: etat,
      p_jeton_rafraichissement: chiffrer(j.refresh_token),
      p_jeton_acces: chiffrer(j.access_token),
      p_expire_le: new Date(Date.now() + j.expires_in * 1000).toISOString(),
      p_peut_ecrire: peutEcrire,
    });
    if (error || !ok) return vers("securite");
  } catch (e) {
    console.error("Connexion Google :", e instanceof Error ? e.message : e);
    return vers("google");
  }
  return vers("ok");
}
