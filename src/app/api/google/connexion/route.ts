import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googlePret, urlConnexion } from "@/lib/agenda";

// « Connecter mon agenda Google » : envoie vers Google (permission : lecture de l'agenda seulement).
// L'« état » secret relie le retour de Google à la personne, même si Google s'ouvre dans Safari
// (sur iPhone, l'app installée et Safari n'ont pas la même session).
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/connexion", req.url));
  if (!googlePret()) return NextResponse.redirect(new URL("/agenda?erreur=configuration", req.url));

  const etat = randomBytes(32).toString("hex");
  const { error } = await supabase.from("google_etats").insert({ etat, user_id: user.id });
  if (error) return NextResponse.redirect(new URL("/agenda?erreur=enregistrement", req.url));
  return NextResponse.redirect(urlConnexion(req.nextUrl.origin, etat));
}
