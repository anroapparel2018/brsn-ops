"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mesCompagnies } from "@/lib/compagnie";
import { appelerClaude, messageErreurIA, texteDe } from "@/lib/ia";

async function superAdmin() {
  const { user, superAdmin } = await mesCompagnies();
  if (!user || !superAdmin) throw new Error("Réservé au super-administrateur");
  return { supabase: await createClient(), user };
}

const slugDe = (nom: string) =>
  nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "compagnie";

// Étape 1 : nom (et logo). La compagnie est créée « active » et Julien en est administrateur.
export async function creerCompagnie(nom: string, logoUrl: string | null) {
  const { supabase, user } = await superAdmin();
  const propre = nom.trim().slice(0, 120);
  if (!propre) return { erreur: "Écris le nom de la compagnie." };
  let slug = slugDe(propre);
  const { data: existe } = await supabase.from("compagnies").select("id").eq("slug", slug).maybeSingle();
  if (existe) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const { data: c, error } = await supabase
    .from("compagnies")
    .insert({ nom: propre, slug, logo_url: logoUrl, cree_par: user.id })
    .select("id")
    .single();
  if (error || !c) return { erreur: "La compagnie n'a pas pu être créée." };
  await supabase.from("membres").insert({ compagnie_id: c.id, user_id: user.id, role: "admin" });
  await supabase.from("profils_marque").insert({ compagnie_id: c.id, statut: "brouillon" });
  await supabase.from("journal_activite").insert({ compagnie_id: c.id, user_id: user.id, action: "compagnie_creee", cible: propre });
  refresh();
  return { id: c.id as string };
}

export type ProfilMarque = {
  couleurs: Partial<Record<"principale" | "secondaire" | "fond" | "surface" | "texte" | "accent", string>>;
  polices: { titres?: string; texte?: string };
  voix: string;
};

// Étape 2 : l'app lit le guide de marque (images ou pages de PDF) et propose un profil.
export async function extraireMarque(images: { type: string; donnees: string }[]): Promise<{ profil?: ProfilMarque; erreur?: string }> {
  await superAdmin();
  if (!images.length) return { erreur: "Dépose au moins une image du guide." };
  try {
    const r = await appelerClaude({
      source: "marque",
      maxTokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            ...images.slice(0, 8).map((i) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: i.type as "image/jpeg", data: i.donnees },
            })),
            {
              type: "text" as const,
              text: `Voici le guide de marque d'une compagnie. Réponds seulement avec un objet JSON :
{"couleurs":{"principale":"#hex","secondaire":"#hex","fond":"#hex","surface":"#hex","texte":"#hex","accent":"#hex"},"polices":{"titres":"","texte":""},"voix":"le ton et la voix de la marque en 2 à 4 phrases, en français du Québec"}
Laisse vide ce que le guide ne dit pas.`,
            },
          ],
        },
      ],
    });
    const brut = texteDe(r).match(/\{[\s\S]*\}/)?.[0];
    if (!brut) return { erreur: "Le guide n'a pas pu être lu. Entre les couleurs à la main." };
    const p = JSON.parse(brut);
    return { profil: { couleurs: p.couleurs ?? {}, polices: p.polices ?? {}, voix: p.voix ?? "" } };
  } catch (e) {
    return { erreur: messageErreurIA(e, "La lecture du guide") };
  }
}

// Étape 3 : enregistrer le profil (brouillon ou approuvé).
export async function enregistrerMarque(id: string, profil: ProfilMarque, approuve: boolean) {
  const { supabase } = await superAdmin();
  const { error } = await supabase.from("profils_marque").upsert({
    compagnie_id: id,
    couleurs: profil.couleurs,
    polices: profil.polices,
    voix: profil.voix || null,
    statut: approuve ? "approuvee" : "brouillon",
    maj_le: new Date().toISOString(),
  });
  refresh();
  return error ? { erreur: "Le profil n'a pas pu être enregistré." } : {};
}

// Étape 4 : copier les agents choisis (et leurs outils par défaut) pour cette compagnie.
export async function choisirAgents(id: string, cles: string[]) {
  const { supabase } = await superAdmin();
  const { data: modeles } = await supabase.from("modeles_agents").select("id, cle, nom, role, icone, ordre, outils_defaut");
  const choisis = (modeles ?? []).filter((m) => cles.includes(m.cle));
  if (!choisis.length) return { erreur: "Choisis au moins un agent." };
  const { data: agents, error } = await supabase
    .from("agents")
    .upsert(
      choisis.map((m) => ({ compagnie_id: id, modele_id: m.id, cle: m.cle, nom: m.nom, role: m.role, icone: m.icone, ordre: m.ordre })),
      { onConflict: "compagnie_id,cle" },
    )
    .select("id, cle");
  if (error) return { erreur: "Les agents n'ont pas pu être ajoutés." };
  const { data: outils } = await supabase.from("outils").select("id, cle");
  const liens = (agents ?? []).flatMap((a) => {
    const m = choisis.find((x) => x.cle === a.cle);
    return (outils ?? []).filter((o) => m?.outils_defaut?.includes(o.cle)).map((o) => ({ agent_id: a.id, outil_id: o.id }));
  });
  if (liens.length) await supabase.from("agents_outils").upsert(liens, { onConflict: "agent_id,outil_id" });
  refresh();
  return {};
}

// Étape 5 : invitations en BROUILLON (aucun courriel ne part sans l'approbation de Julien).
export async function preparerInvitations(id: string, invites: { courriel: string; role: string }[]) {
  const { supabase } = await superAdmin();
  const lignes = invites
    .map((i) => ({ courriel: i.courriel.trim().toLowerCase(), role: i.role }))
    .filter((i) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.courriel) && ["admin", "employe", "client"].includes(i.role))
    .map((i) => ({ ...i, compagnie_id: id, statut: "preparee" }));
  if (lignes.length) {
    const { error } = await supabase.from("invitations").insert(lignes);
    if (error) return { erreur: "Les invitations n'ont pas pu être préparées." };
  }
  refresh();
  return { nombre: lignes.length };
}
