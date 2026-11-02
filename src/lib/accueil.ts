import "server-only";
import { createClientCompagnie as createClient } from "@/lib/compagnie";
import { aujourdhui } from "@/lib/date";
import { trouverAgent } from "@/lib/agents";
import { lirePool, type TacheClickUp } from "@/lib/clickup";
import { COLONNES_TACHE, type Tache } from "@/lib/taches";
import { plusJours, revenu, visible, type Cible } from "@/lib/tri";

// Tout ce qu'il faut pour l'Accueil : priorités calculées, tâches urgentes, éléments revenus de report.

export type Ton = "urgent" | "argent" | "clients" | "employes" | "neutre";

export type Carte = {
  cle: string;
  cible: Cible;
  id: string;
  titre: string;
  pourquoi: string;
  ton: Ton;
  score: number;
  reporte: boolean;
  source: string; // « Acheteur », « POOL ClickUp »…
  lien?: string;
};

type ApprobationAttente = {
  id: string;
  agent: string;
  titre: string;
  type: string;
  reporte_au: string | null;
  cree_le: string;
};
type AlerteActive = {
  id: string;
  agent: string;
  titre: string;
  niveau: "info" | "important" | "urgent";
  reporte_au: string | null;
};
type TriClickUp = { clickup_id: string; accepte_le: string | null; reporte_au: string | null; archive_le: string | null };

// Impact : l'argent, les clients et les employés passent en premier.
const IMPACTS: { ton: Exclude<Ton, "urgent" | "neutre">; mots: RegExp; texte: string }[] = [
  {
    ton: "argent",
    mots: /pai(e|ement)|payer|factur|\$|banc|banque|rbc|\breq\b|rmc|comptab|vente|crédit|assurance|dividende|taxe|prix|coût/i,
    texte: "touche l'argent",
  },
  {
    ton: "clients",
    mots: /client|commande|boutique|site|promo|shopify|black friday|salon|pop-up|livraison|retour|échantillon|usine/i,
    texte: "touche les clients",
  },
  { ton: "employes", mots: /employ|paie|équipe|horaire|quart|contrat|formation|punch/i, texte: "touche les employés" },
];

const joursEntre = (de: string, a: string) =>
  Math.round((new Date(`${a}T12:00:00Z`).getTime() - new Date(`${de}T12:00:00Z`).getTime()) / 86_400_000);

function impact(titre: string) {
  return IMPACTS.find((i) => i.mots.test(titre)) ?? null;
}

// Phrase « pourquoi » : la raison la plus forte, puis l'impact.
function phrase(raisons: string[], titre: string) {
  const i = impact(titre);
  const base = raisons[0] ?? "Ouverte et sans date";
  return `${base}${i ? ` et ${i.texte}` : ""}.`;
}

function scoreEcheance(echeance: string | null, jour: string): { points: number; raison?: string } {
  if (!echeance) return { points: 0 };
  const n = joursEntre(jour, echeance);
  if (n < 0) return { points: 45, raison: `En retard de ${-n} jour${n < -1 ? "s" : ""}` };
  if (n === 0) return { points: 40, raison: "À faire aujourd'hui" };
  if (n <= 3) return { points: 28, raison: `Échéance dans ${n} jour${n > 1 ? "s" : ""}` };
  if (n <= 7) return { points: 15, raison: `Échéance dans ${n} jours` };
  return { points: 0 };
}

function carteTache(t: Tache, jour: string): Carte {
  const raisons: string[] = [];
  let score = 0;
  if (t.categorie === "urgent") {
    score += 40;
    raisons.push("Marquée urgente");
  }
  const e = scoreEcheance(t.echeance, jour);
  score += e.points;
  if (e.raison) raisons.unshift(e.raison);
  if (t.categorie === "aujourdhui") {
    score += 25;
    raisons.push("Prévue aujourd'hui");
  }
  const i = impact(t.titre);
  if (i) score += 20;
  const agent = trouverAgent(t.agent);
  return {
    cle: `tache-${t.id}`,
    cible: "tache",
    id: t.id,
    titre: t.titre,
    pourquoi: phrase(raisons, t.titre),
    ton: t.categorie === "urgent" || (e.points >= 40) ? "urgent" : i?.ton ?? "neutre",
    score,
    reporte: revenu(t, jour),
    source: agent ? `${agent.icone} ${agent.court}` : t.agent,
    lien: "/a-faire",
  };
}

function carteApprobation(a: ApprobationAttente, jour: string): Carte {
  const attente = joursEntre(a.cree_le.slice(0, 10), jour);
  const agent = trouverAgent(a.agent);
  const i = impact(a.titre);
  return {
    cle: `approbation-${a.id}`,
    cible: "approbation",
    id: a.id,
    titre: a.titre,
    pourquoi: phrase(
      [attente >= 2 ? `${agent?.nom ?? "Un agent"} attend ton OK depuis ${attente} jours` : `${agent?.nom ?? "Un agent"} attend ton OK`],
      a.titre,
    ),
    ton: i?.ton ?? "clients",
    score: 30 + Math.min(attente, 5) * 3 + (i ? 20 : 0),
    reporte: revenu(a, jour),
    source: agent ? `${agent.icone} ${agent.court}` : a.agent,
    lien: "#ok",
  };
}

function carteAlerte(a: AlerteActive, jour: string): Carte {
  const agent = trouverAgent(a.agent);
  return {
    cle: `alerte-${a.id}`,
    cible: "alerte",
    id: a.id,
    titre: a.titre,
    pourquoi: phrase([a.niveau === "urgent" ? "Alerte urgente" : a.niveau === "important" ? "Alerte importante" : "Alerte à lire"], a.titre),
    ton: a.niveau === "urgent" ? "urgent" : impact(a.titre)?.ton ?? "neutre",
    score: a.niveau === "urgent" ? 48 : a.niveau === "important" ? 26 : 5,
    reporte: revenu(a, jour),
    source: agent ? `${agent.icone} ${agent.court}` : a.agent,
    lien: "#alertes",
  };
}

function carteClickUp(t: TacheClickUp, tri: TriClickUp | undefined, jour: string): Carte {
  const raisons: string[] = [];
  let score = 0;
  if (t.priorite === "urgent") {
    score += 40;
    raisons.push("Urgente dans ClickUp");
  } else if (t.priorite === "high") {
    score += 22;
    raisons.push("Priorité haute dans ClickUp");
  }
  const e = scoreEcheance(t.echeance, jour);
  score += e.points;
  if (e.raison) raisons.unshift(e.raison);
  const i = impact(t.titre);
  if (i) score += 15;
  return {
    cle: `clickup-${t.id}`,
    cible: "clickup",
    id: t.id,
    titre: t.titre,
    pourquoi: phrase(raisons.length ? raisons : ["Dans ton POOL à trier"], t.titre),
    ton: t.priorite === "urgent" || e.points >= 40 ? "urgent" : i?.ton ?? "neutre",
    score,
    reporte: !!tri && revenu(tri, jour),
    source: "📋 POOL ClickUp",
    lien: t.url,
  };
}

export async function lireAccueil() {
  const supabase = await createClient();
  const jour = aujourdhui();
  const visibleOu = `reporte_au.is.null,reporte_au.lte.${jour}`;
  const anro = supabase.compagnie.slug === "anro";

  const [{ data: taches }, { data: approbations }, { data: alertes }, { data: tri }, pool] = await Promise.all([
    supabase.from("taches").select(COLONNES_TACHE).eq("statut", "a_faire").is("archive_le", null).or(visibleOu),
    supabase
      .from("approbations")
      .select("id, agent, titre, type, reporte_au, cree_le")
      .eq("statut", "en_attente")
      .is("archive_le", null)
      .or(visibleOu),
    supabase
      .from("alertes")
      .select("id, agent, titre, niveau, reporte_au")
      .is("vue_le", null)
      .is("accepte_le", null)
      .is("archive_le", null)
      .or(visibleOu),
    anro ? supabase.from("tri_clickup").select("clickup_id, accepte_le, reporte_au, archive_le") : Promise.resolve({ data: [] }),
    anro ? lirePool().catch(() => null) : Promise.resolve([] as TacheClickUp[]),
  ]);

  const triParId = new Map(((tri ?? []) as TriClickUp[]).map((x) => [x.clickup_id, x]));
  const tachesOuvertes = (taches ?? []) as Tache[];

  const cartes: Carte[] = [
    ...tachesOuvertes.map((t) => carteTache(t, jour)),
    ...((approbations ?? []) as ApprobationAttente[]).map((a) => carteApprobation(a, jour)),
    ...((alertes ?? []) as AlerteActive[]).map((a) => carteAlerte(a, jour)),
    ...(pool ?? [])
      .filter((t) => {
        const x = triParId.get(t.id);
        return !x || visible(x, jour);
      })
      .map((t) => carteClickUp(t, triParId.get(t.id), jour)),
  ];

  // Revenus aujourd'hui (reportés) : tout en haut, une seule fois.
  const reportes = cartes.filter((c) => c.reporte);
  const autres = cartes.filter((c) => !c.reporte).sort((a, b) => b.score - a.score);
  const priorites = autres.slice(0, 3);

  // Tâches urgentes : marquées urgentes ou dont l'échéance est arrivée, triées par date.
  const urgentes = tachesOuvertes
    .filter((t) => !revenu(t, jour) && (t.categorie === "urgent" || (t.echeance && t.echeance <= plusJours(jour, 0))))
    .sort((a, b) => (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999") || a.cree_le.localeCompare(b.cree_le));

  return {
    jour,
    reportes,
    priorites,
    suivantes: autres.length - priorites.length,
    urgentes,
    clickupBranche: anro && pool !== null,
  };
}
