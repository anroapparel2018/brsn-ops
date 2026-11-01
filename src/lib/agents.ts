// Les 10 agents de BRSN OPS. L'identifiant correspond à la colonne « agent » de la table approbations.
export const AGENTS = [
  { id: "cerveau", nom: "Le Cerveau", court: "Cerveau", icone: "🧠" },
  { id: "bras_droit", nom: "Bras droit", court: "Bras droit", icone: "🤝" },
  { id: "tresorier", nom: "Trésorier", court: "Trésorier", icone: "💰" },
  { id: "agent_pub", nom: "Agent Pub", court: "Pub", icone: "📣" },
  { id: "studio", nom: "Studio", court: "Studio", icone: "🎬" },
  { id: "creatif", nom: "Créatif", court: "Créatif", icone: "🎨" },
  { id: "acheteur", nom: "Acheteur", court: "Acheteur", icone: "🛒" },
  { id: "ecommerce", nom: "E-commerce", court: "E-comm.", icone: "🛍️" },
  { id: "rh", nom: "Ressources humaines", court: "RH", icone: "👥" },
  { id: "partenariats", nom: "Partenariats", court: "Partenariats", icone: "🔗" },
] as const;

export type AgentId = (typeof AGENTS)[number]["id"];

export function trouverAgent(id: string) {
  return AGENTS.find((a) => a.id === id);
}

// Le Cerveau a l'accueil ; les autres agents ont leur propre écran.
export function lienAgent(id: AgentId) {
  return id === "cerveau" ? "/" : `/agents/${id}`;
}
