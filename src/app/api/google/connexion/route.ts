import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googlePret, urlConnexion } from "@/lib/agenda";

// « Connecter mon agenda Google » : envoie vers Google (permission : lecture de l'agenda seulement).
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/connexion", req.url));
  if (!googlePret()) return NextResponse.redirect(new URL("/agenda?erreur=configuration", req.url));

  const etat = randomBytes(24).toString("hex");
  const reponse = NextResponse.redirect(urlConnexion(req.nextUrl.origin, etat));
  reponse.cookies.set("google_etat", etat, {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/google",
  });
  return reponse;
}
