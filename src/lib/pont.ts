import { createClient } from "@supabase/supabase-js";

// Pont avec Claude : petit serveur MCP (protocole JSON-RPC sur HTTP, sans session ni flux).
// Chaque appel d'outil est transmis à pont_appel() dans Supabase, qui vérifie le jeton,
// l'appartenance à la compagnie, fait l'action et l'inscrit au journal.

const VERSION_PROTOCOLE = "2025-06-18";

const compagnie = {
  type: "string",
  description: "Compagnie (ex. anro, brsn, le-studio). Par défaut : ANRO. Voir lister_organisations.",
};
const agent = {
  type: "string",
  description: "Agent responsable (ex. acheteur, tresorier, agent_pub). Par défaut : cerveau. Voir lister_agents.",
};

const OUTILS = [
  {
    name: "resume_du_jour",
    description:
      "Résumé de la journée de Julien dans une compagnie : agenda, rappels, tâches urgentes et d'aujourd'hui, nombre d'approbations en attente.",
    inputSchema: { type: "object", properties: { compagnie } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "lister_en_attente",
    description: "Ce qui attend dans une compagnie : approbations en attente, tâches à faire (avec leur id) et notes à classer.",
    inputSchema: { type: "object", properties: { compagnie, agent } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "creer_tache",
    description: "Crée une tâche dans BRSN OPS (onglet À faire).",
    inputSchema: {
      type: "object",
      properties: {
        titre: { type: "string", description: "Titre court et clair." },
        details: { type: "string" },
        compagnie,
        agent,
        categorie: {
          type: "string",
          enum: ["urgent", "aujourdhui", "semaine", "plus_tard", "deleguer"],
          description: "Par défaut, calculée selon l'échéance.",
        },
        echeance: { type: "string", description: "Date AAAA-MM-JJ." },
      },
      required: ["titre"],
    },
  },
  {
    name: "creer_rappel",
    description: "Crée un rappel à une date et une heure précises (notification du matin et bannière dans l'app).",
    inputSchema: {
      type: "object",
      properties: {
        titre: { type: "string" },
        rappel_le: { type: "string", description: "Date et heure ISO 8601 avec fuseau, ex. 2026-11-05T09:00:00-05:00." },
        recurrence: { type: "string", enum: ["hebdo", "2sem", "mensuel", "trimestriel", "1er_lundi"] },
        details: { type: "string" },
        compagnie,
        agent,
      },
      required: ["titre", "rappel_le"],
    },
  },
  {
    name: "creer_approbation",
    description:
      "Demande l'approbation de Julien (pub, contenu, courriel, commande…). Rien n'est envoyé ni publié : Julien décide dans l'app.",
    inputSchema: {
      type: "object",
      properties: {
        titre: { type: "string" },
        details: { type: "string", description: "Tout ce qu'il faut pour décider : texte proposé, montant, lien…" },
        type: { type: "string", enum: ["pub", "contenu", "courriel", "commande", "autre"] },
        compagnie,
        agent,
      },
      required: ["titre"],
    },
  },
  {
    name: "creer_note",
    description: "Garde une note (idée, information) dans le journal de la compagnie.",
    inputSchema: { type: "object", properties: { contenu: { type: "string" }, compagnie, agent }, required: ["contenu"] },
  },
  {
    name: "creer_decision",
    description: "Inscrit une décision prise par Julien dans le journal des décisions de la compagnie.",
    inputSchema: { type: "object", properties: { contenu: { type: "string" }, compagnie, agent }, required: ["contenu"] },
  },
  {
    name: "mettre_a_jour_statut",
    description:
      "Change le statut d'une tâche (a_faire ou fait) ou d'une note (nouvelle ou classee). Les approbations se décident seulement dans l'app.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["tache", "note"] },
        id: { type: "string", description: "L'id reçu de lister_en_attente ou à la création." },
        statut: { type: "string", enum: ["a_faire", "fait", "nouvelle", "classee"] },
        compagnie,
      },
      required: ["type", "id", "statut"],
    },
  },
  {
    name: "lister_organisations",
    description: "Liste les compagnies de Julien (le code à utiliser dans « compagnie »).",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: "lister_agents",
    description: "Liste les agents d'une compagnie (le code à utiliser dans « agent »).",
    inputSchema: { type: "object", properties: { compagnie } },
    annotations: { readOnlyHint: true },
  },
];

const INSTRUCTIONS =
  "BRSN OPS est l'outil de contrôle de Julien Brisson (7 compagnies). Utilise ces outils pour créer des tâches, rappels, " +
  "approbations, notes et décisions, et pour lire ce qui attend. Toujours en français du Québec, tutoiement. " +
  "Rien n'est envoyé, payé ou publié à l'extérieur : ce qui touche un service externe passe par creer_approbation.";

type Requete = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const reponse = (id: Requete["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const erreur = (id: Requete["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

function base() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
}

// Appelle pont_appel. « refuse » : jeton absent, faux ou révoqué.
async function appeler(jeton: string, outil: string, args: unknown) {
  const { data, error } = await base().rpc("pont_appel", { p_jeton: jeton, p_outil: outil, p_args: args ?? {} });
  if (error) return { refuse: true as const };
  return { refuse: false as const, data: data as { ok: boolean; resultat?: unknown; erreur?: string } };
}

async function traiter(jeton: string, r: Requete) {
  switch (r.method) {
    case "initialize":
      return reponse(r.id, {
        protocolVersion: typeof r.params?.protocolVersion === "string" ? r.params.protocolVersion : VERSION_PROTOCOLE,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "brsn-ops", title: "BRSN OPS", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    case "ping":
      return reponse(r.id, {});
    case "tools/list":
      return reponse(r.id, { tools: OUTILS });
    case "tools/call": {
      const nom = String(r.params?.name ?? "");
      if (!OUTILS.some((o) => o.name === nom)) return erreur(r.id, -32602, `Outil inconnu : ${nom}`);
      const res = await appeler(jeton, nom, r.params?.arguments);
      if (res.refuse) return erreur(r.id, -32001, "Jeton invalide ou révoqué. Crée un nouveau lien dans Réglages de BRSN OPS.");
      const texte = res.data.ok ? JSON.stringify(res.data.resultat, null, 2) : `Refusé : ${res.data.erreur}`;
      return reponse(r.id, { content: [{ type: "text", text: texte }], isError: !res.data.ok });
    }
    default:
      return erreur(r.id, -32601, `Méthode non prise en charge : ${r.method}`);
  }
}

const ENTETES = { "Cache-Control": "no-store" };

export async function requeteMcp(req: Request, jetonChemin?: string) {
  const jeton = jetonChemin ?? (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");

  // Le jeton est vérifié avant tout (même pour initialize) : un faux jeton ne voit rien.
  if (!jeton || !(await base().rpc("pont_verifier", { p_jeton: jeton })).data) {
    return Response.json(erreur(null, -32001, "Jeton invalide ou révoqué."), { status: 401, headers: ENTETES });
  }

  let corps: Requete | Requete[];
  try {
    corps = await req.json();
  } catch {
    return Response.json(erreur(null, -32700, "JSON invalide."), { status: 400, headers: ENTETES });
  }

  const liste = Array.isArray(corps) ? corps : [corps];
  // Les notifications (sans id) n'attendent pas de réponse.
  const reponses = await Promise.all(liste.filter((r) => r.id !== undefined && r.id !== null).map((r) => traiter(jeton, r)));
  if (!reponses.length) return new Response(null, { status: 202, headers: ENTETES });
  return Response.json(Array.isArray(corps) ? reponses : reponses[0], { headers: ENTETES });
}

export function nonPermis() {
  return new Response("Méthode non permise.", { status: 405, headers: { Allow: "POST" } });
}
