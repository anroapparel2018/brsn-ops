import Link from "next/link";
import { notFound } from "next/navigation";
import { AGENTS, trouverAgent, lienAgent, type AgentId } from "@/lib/agents";
import { OUTILS, trouverOutil } from "@/lib/outils";

export function generateStaticParams() {
  return AGENTS.flatMap((a) => (OUTILS[a.id] ?? []).map((o) => ({ agent: a.id, outil: o.fichier })));
}

// Un ancien outil, ouvert en grand dans l'app (ses données passent par Supabase grâce au pont).
export default async function EcranOutil({ params }: PageProps<"/agents/[agent]/outils/[outil]">) {
  const p = await params;
  const agent = trouverAgent(p.agent);
  const outil = agent && trouverOutil(agent.id as AgentId, p.outil);
  if (!agent || !outil) notFound();

  return (
    <div className="-mx-5 -mt-4">
      <div className="flex items-center justify-between gap-3 px-5 pb-3">
        <Link href={lienAgent(agent.id)} className="h-11 shrink-0 rounded-xl border-2 border-bordure px-4 py-2 text-base font-bold">
          ← {agent.court}
        </Link>
        <p className="truncate text-base font-bold">{outil.nom}</p>
        <a
          href={`/outils/${outil.fichier}.html`}
          target="_blank"
          className="h-11 shrink-0 rounded-xl border-2 border-bordure px-3 py-2 text-base font-bold"
          aria-label="Ouvrir en plein écran"
        >
          ⤢
        </a>
      </div>
      <iframe
        src={`/outils/${outil.fichier}.html`}
        title={outil.nom}
        allow="camera; microphone; fullscreen; clipboard-write"
        className="h-[calc(100dvh-13rem)] w-full border-0 bg-white"
      />
    </div>
  );
}
