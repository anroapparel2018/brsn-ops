import { NextResponse, type NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { appelerClaude, CleManquante, messageErreurIA } from "@/lib/ia";

// Route serveur pour les anciens outils : remplace « sample » des artefacts Claude.
// La clé Anthropic reste sur le serveur. Les outils (tools) des anciens artefacts s'exécutent
// dans le navigateur, sur les données de l'app seulement ; le pont gère la boucle.

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const corps = await req.json().catch(() => null);
  if (!corps || !Array.isArray(corps.messages) || !corps.messages.length) {
    return NextResponse.json({ erreur: "Requête invalide" }, { status: 400 });
  }
  const outil = String(corps.outil || "outil").replace(/[^a-z0-9_-]/gi, "").slice(0, 80);

  try {
    const r = await appelerClaude({
      source: `outil:${outil}`,
      niveau: corps.niveau === "rapide" ? "rapide" : "complet",
      system: typeof corps.system === "string" ? corps.system : undefined,
      messages: corps.messages as Anthropic.Beta.BetaMessageParam[],
      tools: Array.isArray(corps.tools) && corps.tools.length ? corps.tools : undefined,
    });
    return NextResponse.json({ content: r.content, stop_reason: r.stop_reason });
  } catch (e) {
    const code = e instanceof CleManquante ? "cle_manquante" : "erreur";
    return NextResponse.json({ erreur: messageErreurIA(e), code }, { status: e instanceof CleManquante ? 503 : 500 });
  }
}
