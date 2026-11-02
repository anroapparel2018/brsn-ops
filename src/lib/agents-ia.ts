import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createClientCompagnie as createClient } from "@/lib/compagnie";
import { AGENTS, type AgentId } from "@/lib/agents";
import { jourEnLettres } from "@/lib/date";
import { appelerClaude, texteDe } from "@/lib/ia";
import { instructionsAgent } from "@/lib/instructions";
import { CATEGORIES, formaterRappel, trierParImportance, type Tache } from "@/lib/taches";
import type { Alerte, ApprobationsEnAttente, Evenement, MessageAgent, Priorite } from "@/lib/donnees";
import { ajouterJours, estFinDeSemaine, heure, jourDe, jourSemaine, nomJour } from "@/lib/jours";
import { analyserJour, instantLocal } from "@/lib/agenda-analyse";
import { CATEGORIES_AGENDA, infoCategorie } from "@/lib/categories-agenda";

// Les agents répondent et peuvent créer des tâches, rappels et notes DANS L'APP seulement.
// Ils n'ont aucun outil vers l'extérieur (Shopify, QuickBooks, Outlook…).

export type Contexte = {
  priorites: Priorite[];
  approbations: ApprobationsEnAttente;
  alertes: Alerte[];
  taches: Tache[];
  agenda?: { connecte: boolean; evenements: Evenement[] };
};

// Agenda de la semaine (lecture seule) : événements, trous et conflits d'aujourd'hui.
function decrireAgenda(agenda: Contexte["agenda"]) {
  if (!agenda?.connecte) return "Agenda Google : pas encore branché.";
  const auj = jourDe(Date.now());
  const l = ["Agenda (Google, lecture seule) — Julien travaille du lundi au vendredi :"];
  for (let i = 0; i < 7; i++) {
    const j = ajouterJours(auj, i);
    const evs = agenda.evenements.filter((e) =>
      e.journee_entiere ? jourDe(e.debut) <= j && j < jourDe(e.fin) : jourDe(e.debut) === j,
    );
    l.push(`${nomJour(j)}${estFinDeSemaine(j) ? " (fin de semaine)" : ""} :`);
    if (!evs.length) l.push("- (rien)");
    for (const e of evs) {
      const quand = e.journee_entiere ? "toute la journée" : `${heure(e.debut)}-${heure(e.fin)}`;
      l.push(`- ${quand} ${e.titre} [${infoCategorie(e.categorie ?? e.categorie_auto).nom}]${e.lieu ? ` @ ${e.lieu}` : ""}`);
    }
  }
  const { conflits, trous } = analyserJour(agenda.evenements, auj);
  if (conflits.length) l.push(`Conflits aujourd'hui : ${conflits.map(([a, b]) => `« ${a} » / « ${b} »`).join(" ; ")}`);
  if (trous.length) l.push(`Plages libres aujourd'hui (9 h-17 h) : ${trous.map((t) => `${t.de}-${t.a}`).join(", ")}`);
  return l.join("\n");
}

async function systeme(agentId: AgentId) {
  const agent = AGENTS.find((a) => a.id === agentId)!;
  const autres = AGENTS.filter((a) => a.id !== agentId)
    .map((a) => `${a.nom} (${a.role})`)
    .join("; ");

  return `Tu es ${agent.nom}, un des 10 agents de BRSN OPS, l'application interne de Julien Brisson.
Ton domaine : ${agent.role}.
Les autres agents : ${autres}. Si une question relève surtout d'un autre agent, dis-le à Julien.

${await instructionsAgent(agentId)}

Comment tu réponds :
- Julien te parle souvent à voix haute depuis son téléphone, et ta réponse peut lui être lue : phrases simples, pas de tableaux, peu de symboles.
- Tu peux créer des tâches, des rappels et des notes dans l'app avec tes outils quand Julien le demande ou l'accepte. Confirme ce que tu as créé.
- Tu n'as aucun accès à l'extérieur de l'app. Ne dis jamais que tu as envoyé, payé ou publié quelque chose.
- Tu lis l'agenda Google de Julien. Pour y ajouter quelque chose, utilise « proposer_evenement » : ça crée une demande qu'il approuve dans l'app (rien n'est écrit sans son OK, et tu ne modifies ni ne supprimes jamais un événement). Pour « c'est quoi ma journée / ma semaine », réponds à partir de l'agenda et des tâches, et signale les trous et les conflits.
- Julien travaille du lundi au vendredi : ne planifie jamais rien le samedi ni le dimanche (ni tâche, ni rappel, ni suggestion).
- Le contexte du jour t'est donné avec chaque message. S'il te manque une information, dis-le au lieu d'inventer.`;
}

function decrireContexte({ priorites, approbations, alertes, taches, agenda }: Contexte) {
  const nomAgent = (id: string) => AGENTS.find((a) => a.id === id)?.nom ?? id;
  const l = [`Date : ${jourEnLettres()}`, "", "Priorités du jour de Julien :"];
  if (!priorites.length) l.push("- (aucune écrite)");
  for (const p of priorites) l.push(`- ${p.rang}. ${p.texte}${p.faite ? " (faite)" : ""}`);

  l.push("", `Tâches à faire (${taches.length}), les plus importantes d'abord :`);
  for (const t of trierParImportance(taches).slice(0, 25)) {
    const cat = CATEGORIES.find((c) => c.id === t.categorie)?.nom;
    const rappel = t.rappel_le ? `, rappel ${formaterRappel(t.rappel_le)}` : "";
    const ech = t.echeance ? `, pour le ${t.echeance}` : "";
    l.push(`- [${cat}] ${t.titre} (${nomAgent(t.agent)}${ech}${rappel})`);
  }

  l.push("", `Approbations en attente : ${approbations.total}`);
  for (const [agent, n] of Object.entries(approbations.parAgent)) l.push(`- ${nomAgent(agent)} : ${n}`);

  l.push("", "Alertes non vues :");
  if (!alertes.length) l.push("- (aucune)");
  for (const a of alertes) l.push(`- [${a.niveau}] ${nomAgent(a.agent)} : ${a.titre}`);

  l.push("", decrireAgenda(agenda));
  return l.join("\n");
}

const OUTILS: Anthropic.Beta.BetaToolUnion[] = [
  {
    name: "creer_tache",
    description:
      "Crée une tâche (avec un rappel facultatif) dans la liste « À faire » de Julien. Ne mets une date ou un rappel que si Julien en a donné un.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        titre: { type: "string", description: "Titre court, à l'infinitif." },
        details: { type: ["string", "null"] },
        agent: { type: "string", enum: AGENTS.map((a) => a.id) },
        categorie: { type: "string", enum: CATEGORIES.map((c) => c.id) },
        echeance: { type: ["string", "null"], description: "AAAA-MM-JJ ou null." },
        rappel_le: {
          type: ["string", "null"],
          description: "Date et heure ISO 8601 avec le fuseau du Québec (ex. 2026-11-03T09:00:00-05:00), ou null.",
        },
      },
      required: ["titre", "details", "agent", "categorie", "echeance", "rappel_le"],
    },
  },
  {
    name: "proposer_evenement",
    description:
      "Propose un événement pour l'agenda Google de Julien. Ça crée une DEMANDE qu'il doit approuver dans l'app : rien n'est écrit dans Google avant son OK. Jamais le samedi ni le dimanche. Vérifie les conflits avec l'agenda avant de proposer.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        titre: { type: "string" },
        debut: { type: "string", description: "Date et heure ISO 8601 avec le fuseau du Québec, ex. 2026-11-05T10:00:00-05:00." },
        fin: { type: "string", description: "Date et heure ISO 8601 avec le fuseau du Québec." },
        lieu: { type: ["string", "null"] },
        meet: { type: "boolean", description: "Ajouter un lien Google Meet." },
        categorie: { type: "string", enum: CATEGORIES_AGENDA.map((c) => c.id) },
        description: { type: ["string", "null"] },
      },
      required: ["titre", "debut", "fin", "lieu", "meet", "categorie", "description"],
    },
  },
  {
    name: "creer_note",
    description: "Enregistre une note dans l'app (idée, information à garder, décision prise).",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { contenu: { type: "string" } },
      required: ["contenu"],
    },
  },
];

async function executerOutil(nom: string, entree: Record<string, unknown>): Promise<string> {
  const supabase = await createClient();
  if (nom === "creer_tache") {
    let rappel = typeof entree.rappel_le === "string" && !isNaN(Date.parse(entree.rappel_le))
      ? new Date(entree.rappel_le).toISOString()
      : null;
    // Jamais la fin de semaine : on reporte au lundi (9 h pour un rappel).
    if (rappel && estFinDeSemaine(jourDe(rappel))) {
      const lundi = ajouterJours(jourDe(rappel), jourSemaine(jourDe(rappel)) === 6 ? 2 : 1);
      rappel = new Date(instantLocal(lundi, 9)).toISOString();
    }
    if (typeof entree.echeance === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entree.echeance) && estFinDeSemaine(entree.echeance)) {
      entree.echeance = ajouterJours(entree.echeance, jourSemaine(entree.echeance) === 6 ? 2 : 1);
    }
    const { error } = await supabase.from("taches").insert({
      titre: String(entree.titre ?? "").slice(0, 500),
      details: (entree.details as string) || null,
      agent: AGENTS.some((a) => a.id === entree.agent) ? entree.agent : "cerveau",
      categorie: CATEGORIES.some((c) => c.id === entree.categorie) ? entree.categorie : "plus_tard",
      echeance: (entree.echeance as string) || null,
      rappel_le: rappel,
      source: "cerveau",
    });
    return error ? `Erreur : ${error.message}` : "Tâche créée.";
  }
  if (nom === "proposer_evenement") {
    const debut = new Date(String(entree.debut));
    const fin = new Date(String(entree.fin));
    if (isNaN(debut.getTime()) || isNaN(fin.getTime()) || fin <= debut) return "Erreur : heures invalides.";
    if (estFinDeSemaine(jourDe(debut))) return "Refusé : Julien ne travaille pas la fin de semaine. Propose un jour du lundi au vendredi.";
    const { data: conflits } = await supabase
      .from("evenements")
      .select("titre")
      .lt("debut", fin.toISOString())
      .gt("fin", debut.toISOString())
      .eq("journee_entiere", false);
    const { error } = await supabase.from("agenda_demandes").insert({
      titre: String(entree.titre ?? "").slice(0, 300),
      debut: debut.toISOString(),
      fin: fin.toISOString(),
      lieu: (entree.lieu as string) || null,
      meet: !!entree.meet,
      categorie: CATEGORIES_AGENDA.some((c) => c.id === entree.categorie) ? entree.categorie : "autre",
      description: (entree.description as string) || null,
      source: "cerveau",
    });
    if (error) return `Erreur : ${error.message}`;
    return `Demande créée : Julien doit l'approuver dans l'app (Agenda ou Approbations).${
      conflits?.length ? ` Attention, conflit avec : ${conflits.map((c) => c.titre).join(", ")}.` : ""
    }`;
  }
  if (nom === "creer_note") {
    const { error } = await supabase
      .from("notes")
      .insert({ contenu: String(entree.contenu ?? "").slice(0, 5000), statut: "classee" });
    return error ? `Erreur : ${error.message}` : "Note enregistrée.";
  }
  return "Outil inconnu.";
}

export async function demanderAUnAgent(
  agent: AgentId,
  historique: MessageAgent[],
  message: string,
  contexte: Contexte,
): Promise<string> {
  const system = await systeme(agent);
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...historique.map((m) => ({ role: m.role, content: m.contenu })),
    { role: "user", content: `<contexte>\n${decrireContexte(contexte)}\n</contexte>\n\n${message}` },
  ];

  // Boucle d'outils : au plus 5 tours.
  for (let tour = 0; tour < 5; tour++) {
    const r = await appelerClaude({ source: agent, system, messages, tools: OUTILS });
    if (r.stop_reason === "refusal") {
      return "Je ne peux pas répondre à cette demande. Essaie de la formuler autrement.";
    }
    if (r.stop_reason !== "tool_use") {
      return texteDe(r) || "Je n'ai pas de réponse pour l'instant. Réessaie dans un moment.";
    }
    messages.push({ role: "assistant", content: r.content });
    const resultats: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const b of r.content) {
      if (b.type !== "tool_use") continue;
      const sortie = await executerOutil(b.name, (b.input ?? {}) as Record<string, unknown>);
      resultats.push({ type: "tool_result", tool_use_id: b.id, content: sortie });
    }
    messages.push({ role: "user", content: resultats });
  }
  return "J'ai fait plusieurs actions. Regarde « À faire » pour le détail.";
}

// Bilan de fin de journée : fait, reste, demain.
export async function bilanDeLaJournee(faites: Tache[], contexte: Contexte) {
  const r = await appelerClaude({
    source: "bilan",
    system: await systeme("cerveau"),
    messages: [
      {
        role: "user",
        content: `<contexte>\n${decrireContexte(contexte)}\n\nFait aujourd'hui :\n${
          faites.map((t) => `- ${t.titre}`).join("\n") || "- (rien de coché)"
        }\n</contexte>\n\nFais mon bilan de fin de journée en 3 parties courtes : Fait, Reste, Demain (les 3 choses les plus importantes).`,
      },
    ],
  });
  return texteDe(r);
}
