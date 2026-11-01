"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { synchroniserMonAgenda } from "@/lib/agenda-synchro";
import { creerEvenementGoogle, jetonValide } from "@/lib/agenda";
import { CATEGORIES_AGENDA, categoriser } from "@/lib/categories-agenda";

// À l'ouverture de l'app : synchro si la dernière date de plus de 5 minutes.
export async function synchroniserSiBesoin() {
  const r = await synchroniserMonAgenda();
  if (r.etat === "synchronise") refresh();
  return r.etat;
}

export async function synchroniserMaintenant() {
  const r = await synchroniserMonAgenda({ force: true });
  refresh();
  return r.etat;
}

// Corriger la catégorie (couleur) d'un événement d'un toucher. Gardé dans l'app seulement.
export async function changerCategorie(googleId: string, categorie: string) {
  if (!CATEGORIES_AGENDA.some((c) => c.id === categorie)) return;
  const supabase = await createClient();
  await supabase.from("evenements").update({ categorie }).eq("google_id", googleId);
  refresh();
}

// ----- Demandes d'événements (rien n'est écrit dans Google avant « Approuver ») -----

export type NouvelleDemande = {
  titre: string;
  debut: string; // ISO
  fin: string; // ISO
  journee_entiere?: boolean;
  lieu?: string;
  invites?: string[];
  meet?: boolean;
  categorie?: string;
  description?: string;
};

export async function creerDemande(d: NouvelleDemande) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  const titre = d.titre.trim().slice(0, 300);
  if (!titre) return { erreur: "Écris un titre." };
  if (!(new Date(d.fin) > new Date(d.debut))) return { erreur: "L'heure de fin doit être après le début." };
  const invites = (d.invites ?? []).map((i) => i.trim().toLowerCase()).filter((i) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i));

  const { error } = await supabase.from("agenda_demandes").insert({
    titre,
    debut: d.debut,
    fin: d.fin,
    journee_entiere: !!d.journee_entiere,
    lieu: d.lieu?.trim() || null,
    invites,
    meet: !!d.meet,
    categorie: CATEGORIES_AGENDA.some((c) => c.id === d.categorie) ? d.categorie : categoriser(titre),
    description: d.description?.trim() || null,
    source: "manuel",
  });
  if (error) return { erreur: "La demande n'a pas pu être enregistrée." };
  refresh();
  return {};
}

// « Approuver » : SEUL moment où l'app écrit dans Google Agenda (création d'un nouvel événement).
export async function approuverDemande(id: string) {
  const supabase = await createClient();
  const [{ data: d }, { data: compte }] = await Promise.all([
    supabase.from("agenda_demandes").select("*").eq("id", id).eq("statut", "en_attente").maybeSingle(),
    supabase.from("google_comptes").select("user_id, jeton_rafraichissement, jeton_acces, expire_le, peut_ecrire").maybeSingle(),
  ]);
  if (!d) return { erreur: "Cette demande n'est plus en attente." };
  if (!compte) return { erreur: "Branche d'abord ton agenda Google." };
  if (!compte.peut_ecrire) {
    return { erreur: "Google ne permet pas encore la création d'événements : rebranche ton agenda (Réglages)." };
  }

  try {
    const { acces, nouveau } = await jetonValide(compte);
    if (nouveau) await supabase.from("google_comptes").update(nouveau).eq("user_id", compte.user_id);
    const googleId = await creerEvenementGoogle(acces, d, d.id);
    await supabase
      .from("agenda_demandes")
      .update({ statut: "cree", google_id: googleId, decide_le: new Date().toISOString(), erreur: null })
      .eq("id", id);
    await synchroniserMonAgenda({ force: true });
    // La couleur choisie dans la demande suit l'événement créé.
    await supabase.from("evenements").update({ categorie: d.categorie }).eq("google_id", googleId);
  } catch (e) {
    const permission = e instanceof Error && e.message === "permission";
    await supabase
      .from("agenda_demandes")
      .update({ erreur: permission ? "permission" : "google" })
      .eq("id", id);
    refresh();
    return {
      erreur: permission
        ? "Google a refusé : rebranche ton agenda pour permettre la création d'événements."
        : "Google n'a pas pu créer l'événement. Réessaie dans un moment.",
    };
  }
  refresh();
  return {};
}

export async function refuserDemande(id: string) {
  const supabase = await createClient();
  await supabase
    .from("agenda_demandes")
    .update({ statut: "refuse", decide_le: new Date().toISOString() })
    .eq("id", id)
    .eq("statut", "en_attente");
  refresh();
}

// Déconnecter l'agenda : retire mes jetons et ma copie locale (rien n'est touché dans Google).
export async function deconnecterGoogle() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("evenements").delete().eq("user_id", user.id);
  await supabase.from("google_comptes").delete().eq("user_id", user.id);
  refresh();
}
