import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AGENTS } from "@/lib/agents";
import { jourEnLettres } from "@/lib/date";
import type { Alerte, ApprobationsEnAttente, MessageCerveau, Priorite } from "@/lib/donnees";

// Le Cerveau répond seulement : il n'a aucun outil, donc il ne peut rien envoyer,
// payer, publier ou modifier ailleurs. Appelé côté serveur uniquement (la clé reste secrète).
const SYSTEME = `Tu es Le Cerveau, l'agent principal de BRSN OPS, l'application interne de Julien Brisson (Gestion Julien Brisson inc., ANRO Apparel).
Tu coordonnes les autres agents : ${AGENTS.filter((a) => a.id !== "cerveau")
  .map((a) => a.nom)
  .join(", ")}.

Comment tu réponds :
- En français du Québec, en tutoyant Julien.
- Court et concret : Julien te lit sur son téléphone. Va droit au but, avec des listes courtes au besoin.

Ce que tu ne fais pas :
- Tu n'as accès à aucun outil. Tu ne peux rien envoyer, payer, publier ni modifier chez Shopify, QuickBooks, Outlook, ClickUp ou ailleurs. Ne dis jamais que tu as fait une action.
- Si Julien te demande une action, propose les étapes ou un brouillon. Rien ne se fait sans son approbation dans l'app.
- Le contexte du jour (priorités, approbations, alertes) t'est donné avec chaque message. S'il te manque une information, dis-le au lieu d'inventer.`;

type Contexte = {
  priorites: Priorite[];
  approbations: ApprobationsEnAttente;
  alertes: Alerte[];
};

function decrireContexte({ priorites, approbations, alertes }: Contexte) {
  const nomAgent = (id: string) => AGENTS.find((a) => a.id === id)?.nom ?? id;
  const lignes = [`Date : ${jourEnLettres()}`, "", "Priorités du jour :"];
  if (priorites.length === 0) lignes.push("- (aucune écrite)");
  for (const p of priorites) lignes.push(`- ${p.rang}. ${p.texte}${p.faite ? " (faite)" : ""}`);

  lignes.push("", `Approbations en attente : ${approbations.total}`);
  for (const [agent, n] of Object.entries(approbations.parAgent)) {
    lignes.push(`- ${nomAgent(agent)} : ${n}`);
  }

  lignes.push("", "Alertes non vues :");
  if (alertes.length === 0) lignes.push("- (aucune)");
  for (const a of alertes) lignes.push(`- [${a.niveau}] ${nomAgent(a.agent)} : ${a.titre}`);
  return lignes.join("\n");
}

export async function demanderAuCerveau(
  historique: MessageCerveau[],
  message: string,
  contexte: Contexte,
): Promise<string> {
  const client = new Anthropic(); // lit ANTHROPIC_API_KEY

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...historique.map((m) => ({ role: m.role, content: m.contenu })),
    {
      role: "user",
      content: `<contexte>\n${decrireContexte(contexte)}\n</contexte>\n\n${message}`,
    },
  ];

  const reponse = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium" },
    // Si une réponse est refusée par les filtres de sécurité, l'API essaie un autre modèle.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEME,
    messages,
  });

  if (reponse.stop_reason === "refusal") {
    return "Je ne peux pas répondre à cette demande. Essaie de la formuler autrement.";
  }

  const texte = reponse.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return texte || "Je n'ai pas de réponse pour l'instant. Réessaie dans un moment.";
}
