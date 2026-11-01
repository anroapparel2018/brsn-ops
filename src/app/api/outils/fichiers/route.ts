import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Fichiers des anciens outils (photos, guides, pièces jointes) dans Supabase Storage, dossier privé.
// POST : prépare un envoi direct du navigateur vers Supabase (pas de limite de taille de Vercel).
// GET ?id= : redirige vers une adresse temporaire du fichier. DELETE ?id= : retire le fichier.

const SEAU = "fichiers-outils";
const NOM = /^[a-z0-9_-]{1,80}$/;

async function connecte() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

const erreur = (message: string, statut = 400) => NextResponse.json({ erreur: message }, { status: statut });

export async function POST(req: NextRequest) {
  const supabase = await connecte();
  if (!supabase) return erreur("Non connecté", 401);
  const corps = await req.json().catch(() => null);
  if (!corps || !NOM.test(corps.outil)) return erreur("Requête invalide");

  const nom = String(corps.nom || "fichier").normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
  const id = `${corps.outil}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nom}`;
  const { data, error } = await supabase.storage.from(SEAU).createSignedUploadUrl(id);
  if (error || !data) return erreur("Envoi impossible", 500);
  return NextResponse.json({ id, url: `/api/outils/fichiers?id=${encodeURIComponent(id)}`, envoi: data.signedUrl });
}

export async function GET(req: NextRequest) {
  const supabase = await connecte();
  if (!supabase) return erreur("Non connecté", 401);
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return erreur("Fichier manquant");
  const { data, error } = await supabase.storage.from(SEAU).createSignedUrl(id, 60 * 60);
  if (error || !data) return erreur("Fichier introuvable", 404);
  return NextResponse.redirect(data.signedUrl);
}

export async function DELETE(req: NextRequest) {
  const supabase = await connecte();
  if (!supabase) return erreur("Non connecté", 401);
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (id) await supabase.storage.from(SEAU).remove([id]);
  return NextResponse.json({ ok: true });
}
