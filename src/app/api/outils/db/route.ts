import { NextResponse, type NextRequest } from "next/server";
import { createClientCompagnie as createClient } from "@/lib/compagnie";

// Base de données des anciens outils (remplace le « db » des artefacts Claude).
// Un document = (outil, chemin) ; une collection = les documents directement sous un chemin.

const NOM = /^[a-z0-9_-]{1,80}$/;

async function connecte() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

const erreur = (message: string, statut = 400) => NextResponse.json({ erreur: message }, { status: statut });

export async function GET(req: NextRequest) {
  const c = await connecte();
  if (!c) return erreur("Non connecté", 401);
  const p = req.nextUrl.searchParams;
  const outil = p.get("outil") ?? "";
  if (!NOM.test(outil)) return erreur("Outil invalide");

  const chemin = p.get("chemin");
  if (chemin) {
    const { data } = await c.supabase
      .from("outils_donnees")
      .select("donnees")
      .eq("outil", outil)
      .eq("chemin", chemin)
      .maybeSingle();
    return NextResponse.json({ data: data?.donnees ?? null });
  }

  const collection = p.get("collection");
  if (!collection) return erreur("Chemin manquant");
  const prefixe = `${collection}/`;
  const { data, error } = await c.supabase
    .from("outils_donnees")
    .select("chemin, donnees")
    .eq("outil", outil)
    .like("chemin", `${prefixe.replace(/[\\%_]/g, "\\$&")}%`)
    .limit(5000);
  if (error) return erreur("Lecture impossible", 500);
  const docs = (data ?? [])
    .filter((d) => !d.chemin.slice(prefixe.length).includes("/"))
    .map((d) => ({ id: d.chemin.slice(prefixe.length), data: d.donnees }));
  return NextResponse.json({ docs, utilisateur: { id: c.user.id, email: c.user.email } });
}

// PUT (et POST pour navigator.sendBeacon) : { outil, chemin, data, merge }
async function ecrire(req: NextRequest) {
  const c = await connecte();
  if (!c) return erreur("Non connecté", 401);
  const corps = await req.json().catch(() => null);
  if (!corps || !NOM.test(corps.outil) || typeof corps.chemin !== "string" || !corps.chemin) {
    return erreur("Requête invalide");
  }
  let donnees = corps.data ?? {};
  if (corps.merge) {
    const { data: actuel } = await c.supabase
      .from("outils_donnees")
      .select("donnees")
      .eq("outil", corps.outil)
      .eq("chemin", corps.chemin)
      .maybeSingle();
    donnees = { ...((actuel?.donnees as object) ?? {}), ...donnees };
  }
  const { error } = await c.supabase
    .from("outils_donnees")
    .upsert({ outil: corps.outil, chemin: corps.chemin, donnees, maj_le: new Date().toISOString() });
  if (error) return erreur("Enregistrement impossible", 500);
  return NextResponse.json({ ok: true });
}

export const PUT = ecrire;
export const POST = ecrire;

export async function DELETE(req: NextRequest) {
  const c = await connecte();
  if (!c) return erreur("Non connecté", 401);
  const p = req.nextUrl.searchParams;
  const outil = p.get("outil") ?? "";
  const chemin = p.get("chemin") ?? "";
  if (!NOM.test(outil) || !chemin) return erreur("Requête invalide");
  await c.supabase.from("outils_donnees").delete().eq("outil", outil).eq("chemin", chemin);
  return NextResponse.json({ ok: true });
}
