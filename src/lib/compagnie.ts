import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Compagnie active : choisie dans le sélecteur (témoin « compagnie »), toujours revérifiée côté serveur.
// La sécurité de Supabase (RLS) empêche de toute façon de lire une compagnie dont on n'est pas membre.

export const TEMOIN_COMPAGNIE = "compagnie";

export type Couleurs = Partial<Record<"principale" | "secondaire" | "fond" | "surface" | "texte" | "accent", string>>;

export type Compagnie = {
  id: string;
  slug: string;
  nom: string;
  logo_url: string | null;
  role: "super_admin" | "admin" | "employe" | "client";
  superAdmin: boolean;
  marque: { couleurs: Couleurs; polices: { titres?: string; texte?: string }; voix: string | null } | null;
};

// Tables dont chaque ligne appartient à une compagnie.
const TABLES_COMPAGNIE = new Set([
  "approbations",
  "alertes",
  "taches",
  "notes",
  "usage_ia",
  "outils_donnees",
  "fiches",
  "reglages",
  "priorites",
  "messages_agents",
  "push_abonnements",
  "notifications",
  "agents",
  "journal_activite",
  "historique_tri",
  "tri_clickup",
]);

// Mes compagnies (celles que la sécurité me laisse voir), une fois par requête.
export const mesCompagnies = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, compagnies: [] as Omit<Compagnie, "role" | "superAdmin" | "marque">[], roles: new Map<string, string>(), superAdmin: false };
  const [{ data: compagnies }, { data: membres }, { data: sa }] = await Promise.all([
    supabase.from("compagnies").select("id, slug, nom, logo_url, statut").eq("statut", "active").order("nom"),
    supabase.from("membres").select("compagnie_id, role").eq("user_id", user.id).eq("actif", true),
    supabase.from("super_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  return {
    user,
    compagnies: compagnies ?? [],
    roles: new Map((membres ?? []).map((m) => [m.compagnie_id as string, m.role as string])),
    superAdmin: !!sa,
  };
});

export const compagnieActive = cache(async (): Promise<Compagnie | null> => {
  const { compagnies, roles, superAdmin } = await mesCompagnies();
  if (!compagnies.length) return null;
  const choix = (await cookies()).get(TEMOIN_COMPAGNIE)?.value;
  const c =
    compagnies.find((x) => x.id === choix) ??
    compagnies.find((x) => x.slug === "anro") ??
    compagnies[0];
  const supabase = await createClient();
  const { data: marque } = await supabase
    .from("profils_marque")
    .select("couleurs, polices, voix")
    .eq("compagnie_id", c.id)
    .maybeSingle();
  return {
    ...c,
    role: (roles.get(c.id) as Compagnie["role"]) ?? (superAdmin ? "super_admin" : "employe"),
    superAdmin,
    marque: marque as Compagnie["marque"],
  };
});

type Valeur = Record<string, unknown>;

// Client Supabase limité à la compagnie active : ajoute compagnie_id aux écritures et le filtre aux lectures.
// (Le super-administrateur peut tout voir : sans ce filtre, il verrait toutes les compagnies mélangées.)
export async function createClientCompagnie() {
  const [supabase, compagnie] = await Promise.all([createClient(), compagnieActive()]);
  if (!compagnie) throw new Error("Aucune compagnie active");
  const cid = compagnie.id;
  const avecCid = (v: Valeur | Valeur[]) => (Array.isArray(v) ? v.map((x) => ({ ...x, compagnie_id: cid })) : { ...v, compagnie_id: cid });

  const from = (table: string) => {
    const q = supabase.from(table);
    if (!TABLES_COMPAGNIE.has(table)) return q;
    return {
      select: (colonnes?: string, options?: Parameters<typeof q.select>[1]) => q.select(colonnes, options).eq("compagnie_id", cid),
      insert: (v: Valeur | Valeur[], options?: Parameters<typeof q.insert>[1]) => q.insert(avecCid(v), options),
      upsert: (v: Valeur | Valeur[], options?: Parameters<typeof q.upsert>[1]) => q.upsert(avecCid(v), options),
      update: (v: Valeur, options?: Parameters<typeof q.update>[1]) => q.update(v, options).eq("compagnie_id", cid),
      delete: (options?: Parameters<typeof q.delete>[0]) => q.delete(options).eq("compagnie_id", cid),
    } as unknown as typeof q;
  };

  return Object.assign(Object.create(supabase), { from, compagnie }) as typeof supabase & { compagnie: Compagnie };
}
