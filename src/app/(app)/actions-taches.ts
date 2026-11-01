"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AGENTS, type AgentId } from "@/lib/agents";
import { appelerClaude, cleDisponible, texteDe } from "@/lib/ia";
import {
  CATEGORIES,
  prochaineOccurrence,
  type CategorieId,
  type Recurrence,
} from "@/lib/taches";

async function connecte() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  return supabase;
}

const estAgent = (a: unknown): a is AgentId => AGENTS.some((x) => x.id === a);
const estCategorie = (c: unknown): c is CategorieId => CATEGORIES.some((x) => x.id === c);

export type NouvelleTache = {
  titre: string;
  details?: string;
  agent?: string;
  categorie?: string;
  echeance?: string | null; // AAAA-MM-JJ
  rappel_le?: string | null; // ISO
  source?: "manuel" | "cerveau" | "note";
};

export async function creerTache(t: NouvelleTache) {
  const supabase = await connecte();
  const titre = t.titre.trim().slice(0, 500);
  if (!titre) return { erreur: "Écris un titre." };
  const { error } = await supabase.from("taches").insert({
    titre,
    details: t.details?.trim() || null,
    agent: estAgent(t.agent) ? t.agent : "cerveau",
    categorie: estCategorie(t.categorie) ? t.categorie : "plus_tard",
    echeance: t.echeance || null,
    rappel_le: t.rappel_le || null,
    source: t.source ?? "manuel",
  });
  if (error) return { erreur: "La tâche n'a pas pu être enregistrée." };
  refresh();
  return {};
}

// « Fait ✅ » : si la tâche est récurrente, la suivante se crée toute seule.
export async function terminerTache(id: string) {
  const supabase = await connecte();
  const { data: t } = await supabase
    .from("taches")
    .update({ statut: "fait", fait_le: new Date().toISOString() })
    .eq("id", id)
    .select("titre, details, agent, categorie, rappel_le, recurrence")
    .single();

  if (t?.recurrence && t.rappel_le) {
    const prochain = prochaineOccurrence(new Date(t.rappel_le), t.recurrence as Recurrence);
    await supabase.from("taches").insert({
      titre: t.titre,
      details: t.details,
      agent: t.agent,
      categorie: t.categorie,
      rappel_le: prochain.toISOString(),
      recurrence: t.recurrence,
      source: "systeme",
    });
  }
  refresh();
}

export async function annulerFait(id: string) {
  const supabase = await connecte();
  await supabase.from("taches").update({ statut: "a_faire", fait_le: null }).eq("id", id);
  refresh();
}

// « Reporter » : demain, la semaine prochaine ou plus tard.
export async function reporterTache(id: string, quand: "demain" | "semaine" | "plus_tard") {
  const supabase = await connecte();
  const { data: t } = await supabase.from("taches").select("rappel_le").eq("id", id).single();
  const jours = quand === "demain" ? 1 : quand === "semaine" ? 7 : 30;

  // Le rappel se déplace aussi (à partir de maintenant s'il est déjà passé).
  let rappel: string | null = null;
  if (t?.rappel_le) {
    const base = Math.max(new Date(t.rappel_le).getTime(), Date.now());
    rappel = new Date(base + jours * 86_400_000).toISOString();
  }
  await supabase
    .from("taches")
    .update({
      categorie: quand === "demain" ? "aujourdhui" : quand === "semaine" ? "semaine" : "plus_tard",
      rappel_le: rappel,
      rappel_vu: false,
    })
    .eq("id", id);
  refresh();
}

export async function marquerRappelVu(id: string) {
  const supabase = await connecte();
  await supabase.from("taches").update({ rappel_vu: true }).eq("id", id);
  refresh();
}

// ----- Notes rapides -----

export type Suggestion = {
  type: "tache" | "rappel" | "decision" | "note";
  titre: string;
  agent: AgentId;
  categorie: CategorieId;
  rappel_le: string | null;
  pourquoi: string;
};

export async function creerNote(contenu: string, source: "texte" | "vocal") {
  const supabase = await connecte();
  const texte = contenu.trim().slice(0, 5000);
  if (!texte) return { erreur: "La note est vide." };

  const { data: note, error } = await supabase
    .from("notes")
    .insert({ contenu: texte, source })
    .select("id")
    .single();
  if (error || !note) return { erreur: "La note n'a pas pu être enregistrée." };

  let suggestion: Suggestion | null = null;
  if (cleDisponible()) {
    try {
      suggestion = await suggerer(texte);
      await supabase.from("notes").update({ suggestion }).eq("id", note.id);
    } catch (e) {
      console.error("Suggestion de note :", e);
    }
  }
  refresh();
  return { id: note.id, suggestion };
}

// Le Cerveau (Haiku, petite tâche) propose quoi faire de la note.
async function suggerer(note: string): Promise<Suggestion | null> {
  const maintenant = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "America/Montreal",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());

  const r = await appelerClaude({
    source: "note",
    niveau: "rapide",
    maxTokens: 1000,
    system: `Tu tries les notes rapides de Julien Brisson (ANRO Apparel). Agents : ${AGENTS.map((a) => `${a.id} = ${a.role}`).join(" ; ")}.
Réponds seulement avec un objet JSON :
{"type":"tache|rappel|decision|note","titre":"titre court à l'infinitif","agent":"id de l'agent","categorie":"urgent|aujourdhui|semaine|plus_tard|deleguer","rappel_le":"date et heure ISO 8601 avec fuseau -05:00, ou null","pourquoi":"une phrase"}
Mets un rappel seulement si la note parle d'un moment précis. Ne mets jamais de date au hasard.`,
    messages: [{ role: "user", content: `Maintenant : ${maintenant}.\n\nNote : ${note}` }],
  });

  const brut = texteDe(r).match(/\{[\s\S]*\}/)?.[0];
  if (!brut) return null;
  const s = JSON.parse(brut);
  return {
    type: ["tache", "rappel", "decision", "note"].includes(s.type) ? s.type : "tache",
    titre: String(s.titre || note).slice(0, 500),
    agent: estAgent(s.agent) ? s.agent : "cerveau",
    categorie: estCategorie(s.categorie) ? s.categorie : "plus_tard",
    rappel_le: s.rappel_le && !isNaN(Date.parse(s.rappel_le)) ? new Date(s.rappel_le).toISOString() : null,
    pourquoi: String(s.pourquoi || ""),
  };
}

export async function transformerNote(id: string, t: NouvelleTache) {
  const res = await creerTache({ ...t, source: "note" });
  if (res.erreur) return res;
  const supabase = await connecte();
  await supabase.from("notes").update({ statut: "transformee" }).eq("id", id);
  refresh();
  return {};
}

export async function classerNote(id: string) {
  const supabase = await connecte();
  await supabase.from("notes").update({ statut: "classee" }).eq("id", id);
  refresh();
}
