"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Crée un lien personnel pour le connecteur Claude. Le jeton n'est montré qu'une fois :
// seule son empreinte (SHA-256) est gardée dans la base.
export async function creerLienClaude(nom: string): Promise<{ lien?: string; erreur?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté." };

  const jeton = `brsn_${randomBytes(32).toString("base64url")}`;
  const { error } = await supabase.from("jetons_claude").insert({
    nom: nom.trim().slice(0, 80) || "Claude",
    empreinte: createHash("sha256").update(jeton).digest("hex"),
    apercu: jeton.slice(-4),
  });
  if (error) return { erreur: "Impossible de créer le lien." };

  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "brsn-ops.vercel.app";
  const protocole = h.get("x-forwarded-proto") ?? "https";
  refresh();
  return { lien: `${protocole}://${hote}/api/mcp/${jeton}` };
}

// Coupe l'accès d'un lien tout de suite (le jeton reste inscrit, marqué révoqué).
export async function revoquerLienClaude(id: string) {
  const supabase = await createClient();
  await supabase.from("jetons_claude").update({ revoque_le: new Date().toISOString() }).eq("id", id);
  refresh();
}
