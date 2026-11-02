"use server";

import { refresh, updateTag } from "next/cache";
import { createClientCompagnie as createClient } from "@/lib/compagnie";
import { trouverAgent } from "@/lib/agents";
import {
  TAG_POOL,
  accepterDansClickUp,
  archiverDansClickUp,
  clickupPret,
  creerDansPool,
  reporterDansClickUp,
  restaurerDansClickUp,
} from "@/lib/clickup";
import { jourEnMots, type ActionTri, type Cible, type Retour } from "@/lib/tri";
import { decider } from "./approbations/actions";

const TABLE = { tache: "taches", alerte: "alertes", approbation: "approbations" } as const;
const NOM = { tache: "La tâche", alerte: "L'alerte", approbation: "La décision", clickup: "La tâche ClickUp" } as const;

async function connecte() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  return { supabase, user };
}

// Le choix de Julien sur un élément (tâche, alerte, approbation ou tâche du POOL ClickUp).
// Enregistré dans Supabase, inscrit à l'historique, et reporté dans ClickUp quand la tâche y est liée.
export async function trier(
  cible: Cible,
  id: string,
  action: ActionTri,
  options: { reporteAu?: string; titre?: string } = {},
): Promise<Retour> {
  const { supabase } = await connecte();
  const maintenant = new Date().toISOString();
  if (action === "reporter" && !/^\d{4}-\d{2}-\d{2}$/.test(options.reporteAu ?? "")) {
    return { ok: false, message: "Choisis une date." };
  }
  const champs =
    action === "accepter"
      ? { accepte_le: maintenant, reporte_au: null }
      : action === "reporter"
        ? { reporte_au: options.reporteAu }
        : action === "supprimer"
          ? { archive_le: maintenant }
          : { archive_le: null, reporte_au: null };

  let titre = options.titre ?? null;
  let clickupId: string | null = null;
  let ensuite: string | undefined;

  if (cible === "clickup") {
    clickupId = id;
    const { error } = await supabase
      .from("tri_clickup")
      .upsert({ clickup_id: id, titre, ...champs, maj_le: maintenant }, { onConflict: "compagnie_id,user_id,clickup_id" });
    if (error) return { ok: false, message: "Ton choix n'a pas pu être enregistré. Réessaie." };
  } else {
    const table = TABLE[cible];
    const valeurs =
      cible === "approbation" && action === "accepter" ? { reporte_au: null } : (champs as Record<string, unknown>);
    const { data, error } = await supabase
      .from(table)
      .update(valeurs)
      .eq("id", id)
      .select(cible === "tache" ? "titre, clickup_id" : "titre")
      .maybeSingle();
    if (error || !data) return { ok: false, message: "Ton choix n'a pas pu être enregistré. Réessaie." };
    const ligne = data as unknown as { titre: string; clickup_id?: string | null };
    titre = ligne.titre;
    clickupId = ligne.clickup_id ?? null;
  }

  // Alerte acceptée : elle devient une tâche dans le POOL ClickUp (à trier, sans date limite).
  if (cible === "alerte" && action === "accepter") {
    if (!clickupPret()) {
      ensuite = "ClickUp n'est pas branché : la tâche n'a pas été créée dans le POOL.";
    } else {
      try {
        const { data: a } = await supabase.from("alertes").select("titre, details, pourquoi, action, agent").eq("id", id).single();
        const t = await creerDansPool(
          a!.action || a!.titre,
          [a!.titre, a!.pourquoi, a!.details, `Créée depuis BRSN OPS (alerte de ${trouverAgent(a!.agent)?.nom ?? a!.agent}).`]
            .filter(Boolean)
            .join("\n\n"),
        );
        updateTag(TAG_POOL);
        ensuite = "Tâche créée dans le POOL ClickUp, à trier, sans date limite.";
        await supabase.from("historique_tri").insert({ cible: "clickup", cible_id: t.id, titre, action: "accepter" });
      } catch {
        ensuite = "Attention : la tâche n'a pas pu être créée dans ClickUp. L'alerte reste acceptée ici ; réessaie plus tard.";
      }
    }
  } else if (clickupId && clickupPret()) {
    try {
      if (action === "accepter") await accepterDansClickUp(clickupId);
      else if (action === "reporter") await reporterDansClickUp(clickupId, options.reporteAu!);
      else if (action === "supprimer") await archiverDansClickUp(clickupId);
      else await restaurerDansClickUp(clickupId);
      updateTag(TAG_POOL);
    } catch {
      ensuite = "Enregistré ici, mais ClickUp n'a pas répondu : la tâche ClickUp n'est pas à jour.";
    }
  }

  await supabase.from("historique_tri").insert({
    cible,
    cible_id: id,
    titre,
    action,
    reporte_au: action === "reporter" ? options.reporteAu : null,
  });
  refresh();

  const nom = NOM[cible];
  const dansClickUp = clickupId && !ensuite ? " ClickUp est à jour." : "";
  switch (action) {
    case "accepter":
      return {
        ok: true,
        message:
          cible === "alerte"
            ? "Alerte acceptée."
            : cible === "approbation"
              ? "Noté : tu t'en occupes. Elle reste dans « Ce qui attend ton OK » jusqu'à ta décision."
              : `${nom} est à toi : elle reste active.${dansClickUp}`,
        ensuite,
      };
    case "reporter":
      return {
        ok: true,
        message: `${nom} revient ${jourEnMots(options.reporteAu!)}, en haut de ta page, marquée « Reporté ».${dansClickUp}`,
        ensuite,
        annuler: { cible, id },
      };
    case "supprimer":
      return {
        ok: true,
        message: `${nom} est archivée. Tu la retrouves dans l'historique.${dansClickUp}`,
        ensuite,
        annuler: { cible, id },
      };
    default:
      return { ok: true, message: `${nom} est de retour.`, ensuite };
  }
}

// Décision sur une approbation depuis l'Accueil, avec un retour clair sur la suite.
export async function deciderAccueil(
  id: string,
  statut: "approuve" | "a_changer",
  commentaire: string,
): Promise<Retour> {
  const { supabase } = await connecte();
  const { data: a } = await supabase.from("approbations").select("titre, agent, type").eq("id", id).maybeSingle();
  if (!a) return { ok: false, message: "Cette demande n'existe plus." };
  const res = await decider(id, statut, commentaire, null);
  if (res.erreur) return { ok: false, message: res.erreur };
  await supabase.from("historique_tri").insert({
    cible: "approbation",
    cible_id: id,
    titre: a.titre,
    action: statut === "approuve" ? "approuver" : "a_changer",
    commentaire: commentaire.trim() || null,
  });
  const agent = trouverAgent(a.agent)?.nom ?? a.agent;
  const quoi: Record<string, string> = {
    pub: "lancer la pub",
    contenu: "publier le contenu",
    courriel: "envoyer le courriel",
    commande: "passer la commande",
  };
  const suite = quoi[a.type] ?? "faire la suite";
  return statut === "approuve"
    ? {
        ok: true,
        message: `Approuvé : ${agent} peut maintenant ${suite}.`,
        ensuite: "Rien ne part tout seul tant que le service n'est pas branché à l'app. C'est dans l'historique de tes décisions.",
      }
    : {
        ok: true,
        message: `Renvoyé à ${agent} avec ton commentaire.`,
        ensuite: "Il te reviendra avec une nouvelle version à approuver.",
      };
}
