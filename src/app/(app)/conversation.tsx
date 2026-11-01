import { Suspense } from "react";
import { trouverAgent, type AgentId } from "@/lib/agents";
import { lireMessages } from "@/lib/donnees";
import { BoiteAgent } from "./boite-agent";

// Conversation (vocale ou écrite) avec un agent, utilisée sur l'Accueil et sur chaque écran d'agent.
export function Conversation({ agent }: { agent: AgentId }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-carte" />}>
      <Historique agent={agent} />
    </Suspense>
  );
}

async function Historique({ agent }: { agent: AgentId }) {
  const nom = trouverAgent(agent)!.nom;
  return <BoiteAgent agent={agent} nom={nom} messages={await lireMessages(agent, 10)} />;
}
