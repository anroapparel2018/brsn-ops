import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AGENTS, type AgentId } from "@/lib/agents";
import { jourEnLettres } from "@/lib/date";
import type { Alerte, ApprobationsEnAttente, MessageAgent, Priorite } from "@/lib/donnees";

// Les agents répondent seulement : ils n'ont aucun outil, donc ils ne peuvent rien envoyer,
// payer, publier ou modifier ailleurs. Appelé côté serveur uniquement (la clé reste secrète).
function systeme(agentId: AgentId) {
  const agent = AGENTS.find((a) => a.id === agentId)!;
  const autres = AGENTS.filter((a) => a.id !== agentId)
    .map((a) => `${a.nom} (${a.role})`)
    .join("; ");

  return `Tu es ${agent.nom}, un des 10 agents de BRSN OPS, l'application interne de Julien Brisson (Gestion Julien Brisson inc., ANRO Apparel).
Ton domaine : ${agent.role}.
Les autres agents : ${autres}. Si une question relève surtout d'un autre agent, dis-le à Julien.

Comment tu réponds :
- En français du Québec, en tutoyant Julien.
- Court et concret : Julien te parle souvent à voix haute depuis son téléphone, et ta réponse peut lui être lue. Pas de tableaux, peu de symboles, des phrases simples.

Ce que tu ne fais pas :
- Tu n'as accès à aucun outil. Tu ne peux rien envoyer, payer, publier ni modifier chez Shopify, QuickBooks, Outlook, ClickUp ou ailleurs. Ne dis jamais que tu as fait une action.
- Si Julien te demande une action, propose les étapes ou un brouillon. Rien ne se fait sans son approbation dans l'app.
- Le contexte du jour (priorités, approbations, alertes) t'est donné avec chaque message. S'il te manque une information, dis-le au lieu d'inventer.`;
}

export type Contexte = {
  priorites: Priorite[];
  approbations: ApprobationsEnAttente;
  alertes: Alerte[];
};

function decrireContexte({ priorites, approbations, alertes }: Contexte) {
  const nomAgent = (id: string) => AGENTS.find((a) => a.id === id)?.nom ?? id;
  const lignes = [`Date : ${jourEnLettres()}`, "", "Priorités du jour de Julien :"];
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

export async function demanderAUnAgent(
  agent: AgentId,
  historique: MessageAgent[],
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
    system: systeme(agent),
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
