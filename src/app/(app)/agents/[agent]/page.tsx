import { notFound } from "next/navigation";
import { AGENTS, trouverAgent } from "@/lib/agents";

export function generateStaticParams() {
  return AGENTS.filter((a) => a.id !== "cerveau").map((a) => ({ agent: a.id }));
}

export default async function EcranAgent({ params }: PageProps<"/agents/[agent]">) {
  const agent = trouverAgent((await params).agent);
  if (!agent || agent.id === "cerveau") notFound();

  return (
    <>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">
        {agent.icone} Agent
      </p>
      <h1 className="mt-2 text-3xl font-black">{agent.nom}</h1>
      <div className="mt-8 rounded-2xl bg-carte p-6">
        <p className="text-lg font-bold">Bientôt</p>
        <p className="mt-2 text-base text-discret">Cet écran est en préparation.</p>
      </div>
    </>
  );
}
