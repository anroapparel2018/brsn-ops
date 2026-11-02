import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createClientCompagnie as createClient } from "@/lib/compagnie";

// Point unique d'appel à l'API Claude, côté serveur seulement.
// - Sonnet 5.5 pour les conversations et analyses, Haiku 5.5 pour les petites tâches.
// - Mise en cache automatique des instructions (cache_control).
// - Chaque appel enregistre ses jetons et son coût estimé dans la table usage_ia.

export const MODELES = {
  complet: "claude-sonnet-5-5",
  rapide: "claude-haiku-5-5",
} as const;
export type Niveau = keyof typeof MODELES;

// Prix en $ US par million de jetons (entrée, sortie, cache lu, cache écrit).
const PRIX: Record<string, [number, number, number, number]> = {
  "claude-sonnet-5-5": [2, 10, 0.2, 2.5],
  "claude-haiku-5-5": [0.1, 0.5, 0.01, 0.125],
};

export class CleManquante extends Error {
  constructor() {
    super("La clé Anthropic manque.");
  }
}

export function cleDisponible() {
  return !!process.env.ANTHROPIC_API_KEY;
}

type Appel = {
  source: string; // ex. « cerveau », « note », « outil:acheteur »
  niveau?: Niveau;
  system?: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  tools?: Anthropic.Beta.BetaToolUnion[];
  maxTokens?: number;
};

export async function appelerClaude({
  source,
  niveau = "complet",
  system,
  messages,
  tools,
  maxTokens = 16000,
}: Appel): Promise<Anthropic.Beta.BetaMessage> {
  if (!cleDisponible()) throw new CleManquante();
  const client = new Anthropic();
  const model = MODELES[niveau];

  const reponse = await client.beta.messages.create({
    model,
    max_tokens: maxTokens,
    cache_control: { type: "ephemeral" },
    ...(system ? { system } : {}),
    ...(tools?.length ? { tools } : {}),
    messages,
    ...(niveau === "complet"
      ? {
          output_config: { effort: "medium" as const },
          // Si une réponse est refusée par les filtres de sécurité, l'API essaie un autre modèle.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default" as const,
        }
      : { output_config: { effort: "low" as const } }),
  });

  await noterUsage(source, reponse);
  return reponse;
}

async function noterUsage(source: string, r: Anthropic.Beta.BetaMessage) {
  const u = r.usage;
  const [pe, ps, pl, pc] = PRIX[r.model] ?? PRIX[MODELES.complet];
  const entree = u.input_tokens ?? 0;
  const sortie = u.output_tokens ?? 0;
  const lus = u.cache_read_input_tokens ?? 0;
  const ecrits = u.cache_creation_input_tokens ?? 0;
  const cout = (entree * pe + sortie * ps + lus * pl + ecrits * pc) / 1_000_000;
  try {
    const supabase = await createClient();
    await supabase.from("usage_ia").insert({
      source,
      modele: r.model,
      jetons_entree: entree,
      jetons_sortie: sortie,
      jetons_cache_lus: lus,
      jetons_cache_ecrits: ecrits,
      cout_usd: cout,
    });
  } catch (e) {
    console.error("Suivi des coûts :", e);
  }
}

// Texte de la réponse (blocs texte seulement).
export function texteDe(r: Anthropic.Beta.BetaMessage) {
  return r.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Message d'erreur clair pour Julien.
export function messageErreurIA(e: unknown, nom = "Le Cerveau") {
  if (e instanceof CleManquante) return `${nom} n'est pas encore branché : la clé Anthropic manque.`;
  if (e instanceof Anthropic.AuthenticationError) return "La clé Anthropic est refusée. Vérifie-la.";
  if (e instanceof Anthropic.RateLimitError) return `${nom} est très occupé. Réessaie dans une minute.`;
  if (e instanceof Anthropic.BadRequestError && /credit|balance/i.test(e.message)) {
    return "Plus de crédits Anthropic. Ajoute des crédits dans platform.claude.com → Billing.";
  }
  console.error(`${nom} :`, e);
  return `${nom} n'a pas pu répondre. Réessaie dans un moment.`;
}
