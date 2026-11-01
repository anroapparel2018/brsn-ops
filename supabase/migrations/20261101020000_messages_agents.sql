-- Chaque agent a sa propre conversation (texte ou vocal) : l'historique du Cerveau devient celui de tous les agents.
alter table public.messages_cerveau rename to messages_agents;
alter index public.messages_cerveau_user_idx rename to messages_agents_user_idx;

alter table public.messages_agents
  add column agent text not null default 'cerveau' check (agent in (
    'cerveau', 'bras_droit', 'tresorier', 'agent_pub', 'studio',
    'creatif', 'acheteur', 'ecommerce', 'rh', 'partenariats'
  ));

drop index public.messages_agents_user_idx;
create index messages_agents_user_idx on public.messages_agents (user_id, agent, cree_le desc);
