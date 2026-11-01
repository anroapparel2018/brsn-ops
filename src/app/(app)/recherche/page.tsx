import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { trouverAgent, lienAgent, type AgentId } from "@/lib/agents";
import { FICHES } from "@/lib/fiches";

// Recherche globale : tâches, notes, fiches (fournisseurs, partenaires, équipe…).
export default function Recherche({ searchParams }: PageProps<"/recherche">) {
  return (
    <>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">🔎 Recherche</p>
      <h1 className="mt-2 text-3xl font-black">Rechercher</h1>
      <Suspense fallback={<div className="mt-6 h-14 animate-pulse rounded-2xl bg-carte" />}>
        <Resultats searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const agentDuType = (type: string) =>
  (Object.entries(FICHES).find(([, c]) => c?.some((x) => x.type === type))?.[0] ?? "cerveau") as AgentId;

async function Resultats({ searchParams }: { searchParams: PageProps<"/recherche">["searchParams"] }) {
  const q = String((await searchParams).q ?? "").trim().slice(0, 100);
  // Caractères réservés des filtres de Supabase retirés de la recherche.
  const motif = `%${q.replace(/[,()*\\%_]/g, " ").trim()}%`;

  let taches: { id: string; titre: string; agent: string; statut: string }[] = [];
  let notes: { id: string; contenu: string }[] = [];
  let fiches: { id: string; nom: string; type: string; sous_titre: string | null }[] = [];
  if (q) {
    const supabase = await createClient();
    const [t, n, f] = await Promise.all([
      supabase.from("taches").select("id, titre, agent, statut").or(`titre.ilike.${motif},details.ilike.${motif}`).limit(30),
      supabase.from("notes").select("id, contenu").ilike("contenu", motif).limit(20),
      supabase
        .from("fiches")
        .select("id, nom, type, sous_titre")
        .or(`nom.ilike.${motif},sous_titre.ilike.${motif},details.ilike.${motif}`)
        .limit(30),
    ]);
    taches = t.data ?? [];
    notes = n.data ?? [];
    fiches = f.data ?? [];
  }
  const total = taches.length + notes.length + fiches.length;

  return (
    <>
      <form className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Tâche, fournisseur, partenaire, note…"
          className="h-14 min-w-0 flex-1 rounded-xl border-2 border-bordure bg-fond px-4 text-lg outline-none focus:border-orange"
        />
        <button className="h-14 rounded-xl bg-orange px-5 text-lg font-bold text-white">OK</button>
      </form>

      {q && total === 0 && <p className="mt-6 rounded-2xl bg-carte p-5 text-base">Rien trouvé pour « {q} ».</p>}

      {fiches.length > 0 && (
        <Bloc titre="Fiches">
          {fiches.map((f) => {
            const agent = agentDuType(f.type);
            return (
              <Link key={f.id} href={`${lienAgent(agent)}#${f.type}`} className="block rounded-2xl bg-carte p-4">
                <p className="text-lg font-bold">{f.nom}</p>
                <p className="text-sm text-discret">
                  {trouverAgent(agent)?.icone} {f.type}
                  {f.sous_titre ? ` · ${f.sous_titre}` : ""}
                </p>
              </Link>
            );
          })}
        </Bloc>
      )}
      {taches.length > 0 && (
        <Bloc titre="Tâches">
          {taches.map((t) => (
            <Link key={t.id} href="/a-faire" className="block rounded-2xl bg-carte p-4">
              <p className={`text-lg font-bold ${t.statut === "fait" ? "text-discret line-through" : ""}`}>{t.titre}</p>
              <p className="text-sm text-discret">
                {trouverAgent(t.agent)?.icone} {trouverAgent(t.agent)?.court}
              </p>
            </Link>
          ))}
        </Bloc>
      )}
      {notes.length > 0 && (
        <Bloc titre="Notes">
          {notes.map((n) => (
            <p key={n.id} className="rounded-2xl bg-carte p-4 text-base">
              {n.contenu}
            </p>
          ))}
        </Bloc>
      )}
    </>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-black">{titre}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
