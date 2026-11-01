// Les 10 agents de BRSN OPS. L'identifiant correspond à la colonne « agent » de la table approbations.
// « role » : description provisoire, donnée à l'agent quand Julien lui parle. À ajuster avec Julien.
export const AGENTS = [
  {
    id: "cerveau",
    nom: "Le Cerveau",
    court: "Cerveau",
    icone: "🧠",
    role: "l'agent principal : vue d'ensemble, priorités, coordination des autres agents",
  },
  {
    id: "bras_droit",
    nom: "Bras droit",
    court: "Bras droit",
    icone: "🤝",
    role: "l'adjoint de Julien : agenda, courriels, suivis et organisation du quotidien",
  },
  {
    id: "tresorier",
    nom: "Trésorier",
    court: "Trésorier",
    icone: "💰",
    role: "les finances : liquidités, factures, dépenses et comptabilité (QuickBooks)",
  },
  {
    id: "agent_pub",
    nom: "Agent Pub",
    court: "Pub",
    icone: "📣",
    role: "la publicité payante : campagnes Meta et TikTok, budgets et résultats",
  },
  {
    id: "studio",
    nom: "Studio",
    court: "Studio",
    icone: "🎬",
    role: "la production de contenu : photos, vidéos et tournages",
  },
  {
    id: "creatif",
    nom: "Créatif",
    court: "Créatif",
    icone: "🎨",
    role: "les idées et le design : concepts, visuels, textes et image de marque",
  },
  {
    id: "acheteur",
    nom: "Acheteur",
    court: "Acheteur",
    icone: "🛒",
    role: "les achats : fournisseurs, commandes, coûts et inventaire",
  },
  {
    id: "ecommerce",
    nom: "E-commerce",
    court: "E-comm.",
    icone: "🛍️",
    role: "la boutique en ligne Shopify : produits, commandes, ventes et clients",
  },
  {
    id: "rh",
    nom: "Ressources humaines",
    court: "RH",
    icone: "👥",
    role: "les employés : horaires, embauche, paie et suivi de l'équipe",
  },
  {
    id: "partenariats",
    nom: "Partenariats",
    court: "Partenariats",
    icone: "🔗",
    role: "les collaborations : partenaires, influenceurs, commandites et ententes",
  },
] as const;

export type AgentId = (typeof AGENTS)[number]["id"];

export function trouverAgent(id: string) {
  return AGENTS.find((a) => a.id === id);
}

// Le Cerveau a l'accueil ; les autres agents ont leur propre écran.
export function lienAgent(id: AgentId) {
  return id === "cerveau" ? "/" : `/agents/${id}`;
}
