import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chiffrer, echangerCode, PORTEE } from "@/lib/agenda";
import { synchroniserMonAgenda } from "@/lib/agenda-synchro";

// Retour de Google : on garde les jetons chiffrés, puis on fait une première synchro.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const vers = (chemin: string) => {
    const r = NextResponse.redirect(new URL(chemin, req.url));
    r.cookies.delete({ name: "google_etat", path: "/api/google" });
    return r;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return vers("/connexion");

  const etat = req.cookies.get("google_etat")?.value;
  if (!etat || etat !== p.get("state")) return vers("/agenda?erreur=securite");
  if (p.get("error") || !p.get("code")) return vers("/agenda?erreur=refus");

  try {
    const j = await echangerCode(p.get("code")!, req.nextUrl.origin);
    if (!j.refresh_token) return vers("/agenda?erreur=jeton");
    if (j.scope && !j.scope.split(" ").includes(PORTEE)) return vers("/agenda?erreur=permission");

    const { error } = await supabase.from("google_comptes").upsert({
      user_id: user.id,
      jeton_rafraichissement: chiffrer(j.refresh_token),
      jeton_acces: chiffrer(j.access_token),
      expire_le: new Date(Date.now() + j.expires_in * 1000).toISOString(),
      derniere_synchro: null,
    });
    if (error) return vers("/agenda?erreur=enregistrement");
  } catch (e) {
    console.error("Connexion Google :", e instanceof Error ? e.message : e);
    return vers("/agenda?erreur=google");
  }

  await synchroniserMonAgenda({ force: true });
  return vers("/agenda?connecte=1");
}
