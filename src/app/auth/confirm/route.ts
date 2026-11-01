import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Arrivée du lien magique reçu par courriel : on ouvre la session puis on va à l'accueil.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;

  // token_hash : fonctionne même si le lien s'ouvre dans un autre navigateur (ex. l'app Courriel du téléphone).
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) console.error("Connexion (token_hash) :", error.message);
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("Connexion (code) :", error.message);
    ok = !error;
  }

  const url = request.nextUrl.clone();
  url.search = "";
  url.pathname = ok ? "/" : "/connexion";
  if (!ok) url.searchParams.set("erreur", "lien");
  return NextResponse.redirect(url);
}
