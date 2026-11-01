import { notFound } from "next/navigation";
import { AGENTS, trouverAgent } from "@/lib/agents";
import { Conversation } from "../../conversation";

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
      <p className="mt-2 text-base text-discret first-letter:uppercase">{agent.role}</p>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-black">Parler à {agent.nom}</h2>
        <Conversation agent={agent.id} />
      </section>

      <div className="mt-10 rounded-2xl bg-carte p-6">
        <p className="text-lg font-bold">Ses outils : bientôt</p>
        <p className="mt-2 text-base text-discret">
          Les outils propres à cet agent arriveront dans une prochaine étape.
        </p>
      </div>
    </>
  );
}
