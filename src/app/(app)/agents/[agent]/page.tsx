import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AGENTS, trouverAgent, type AgentId } from "@/lib/agents";
import { OUTILS } from "@/lib/outils";
import { FICHES } from "@/lib/fiches";
import { PROMOS } from "@/lib/promos";
import { formaterDate } from "@/lib/taches";
import { lireApprobations, lireFiches, lireTachesAFaire } from "@/lib/donnees";
import { heureActuelle } from "@/lib/date";
import { CarteTache } from "../../a-faire/carte-tache";
import { VueApprobations } from "../../approbations/vue-approbations";
import type { Approbation } from "../../approbations/bloc-approbation";
import { ListeFiches, type Fiche } from "./liste-fiches";

export function generateStaticParams() {
  return AGENTS.filter((a) => a.id !== "cerveau").map((a) => ({ agent: a.id }));
}

// Branchements prévus (rien n'est relié pour l'instant : on prépare, Julien approuve).
const A_BRANCHER: Partial<Record<AgentId, string[]>> = {
  bras_droit: ["Outlook", "Slack"],
  tresorier: ["QuickBooks", "RBC"],
  agent_pub: ["Meta", "TikTok Ads", "Google Drive"],
  studio: ["Google Drive"],
  creatif: ["Google Drive"],
  acheteur: ["Alibaba", "Courriel fournisseurs"],
  ecommerce: ["Shopify"],
  rh: ["QuickBooks Paie"],
  partenariats: ["Google Drive"],
};

export default async function EcranAgent({ params }: PageProps<"/agents/[agent]">) {
  const agent = trouverAgent((await params).agent);
  if (!agent || agent.id === "cerveau") notFound();
  const outils = OUTILS[agent.id] ?? [];
  const principal = outils.find((o) => o.principal);
  const autres = outils.filter((o) => !o.principal);
  const sections = [...new Set(autres.map((o) => o.section ?? "Outils"))];

  return (
    <>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">{agent.icone} Agent</p>
      <h1 className="mt-2 text-3xl font-black">{agent.nom}</h1>
      <p className="mt-2 text-base text-discret first-letter:uppercase">{agent.role}</p>

      {A_BRANCHER[agent.id] && (
        <div className="mt-4 flex flex-wrap gap-2">
          {A_BRANCHER[agent.id]!.map((b) => (
            <span key={b} className="rounded-full border-2 border-dashed border-bordure px-3 py-1 text-sm font-semibold text-discret">
              🔌 {b} : à brancher
            </span>
          ))}
        </div>
      )}

      {principal && (
        <Link
          href={`/agents/${agent.id}/outils/${principal.fichier}`}
          className="mt-6 block rounded-2xl bg-orange p-5 text-white active:scale-[0.99]"
        >
          <p className="text-sm font-semibold opacity-90">Outil principal</p>
          <p className="text-2xl font-black">{principal.nom} →</p>
          <p className="mt-1 text-base opacity-90">{principal.description}</p>
        </Link>
      )}

      <Extras agent={agent.id} />

      <Suspense fallback={null}>
        <TachesAgent agent={agent.id} />
      </Suspense>

      {agent.id === "bras_droit" && (
        <Suspense fallback={null}>
          <CourrielsAApprouver />
        </Suspense>
      )}

      {(FICHES[agent.id] ?? []).length > 0 && (
        <Suspense fallback={<div className="mt-10 h-24 animate-pulse rounded-2xl bg-carte" />}>
          <Fiches agent={agent.id} />
        </Suspense>
      )}

      {sections.map((s) => (
        <section key={s} className="mt-10">
          <h2 className="mb-4 text-xl font-black">{s}</h2>
          <ul className="flex flex-col gap-2">
            {autres
              .filter((o) => (o.section ?? "Outils") === s)
              .map((o) => (
                <li key={o.fichier}>
                  <Link href={`/agents/${agent.id}/outils/${o.fichier}`} className="block rounded-2xl bg-carte p-4 active:scale-[0.99]">
                    <p className="text-lg font-bold">{o.nom} →</p>
                    <p className="text-base text-discret">{o.description}</p>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}

async function TachesAgent({ agent }: { agent: AgentId }) {
  const taches = (await lireTachesAFaire()).filter((t) => t.agent === agent);
  const maintenant = heureActuelle();
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-black">Ses dossiers ({taches.length})</h2>
      {taches.length ? (
        <ul className="flex flex-col gap-3">
          {taches.map((t) => (
            <CarteTache key={t.id} tache={t} maintenant={maintenant} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-carte p-5 text-base text-discret">
          Aucun dossier. Utilise « + Note » ou demande-le à Claude.
        </p>
      )}
    </section>
  );
}

async function CourrielsAApprouver() {
  const { enAttente, historique } = await lireApprobations("bras_droit");
  return (
    <section className="mt-10">
      <h2 className="text-xl font-black">Courriels à approuver</h2>
      <p className="mt-1 text-base text-discret">
        Le Bras droit prépare les courriels et les relances (après 3 jours sans réponse). Rien ne part sans ton OK :
        Outlook est à brancher.
      </p>
      <VueApprobations
        enAttente={enAttente as Approbation[]}
        historique={historique as Approbation[]}
        agentFixe="bras_droit"
      />
    </section>
  );
}

async function Fiches({ agent }: { agent: AgentId }) {
  const configs = FICHES[agent] ?? [];
  const fiches = (await lireFiches(configs.map((c) => c.type))) as (Fiche & { type: string })[];
  return (
    <>
      {configs.map((c) => (
        <ListeFiches key={c.type} config={c} agent={agent} fiches={fiches.filter((f) => f.type === c.type)} />
      ))}
    </>
  );
}

// Encadrés propres à certains agents.
function Extras({ agent }: { agent: AgentId }) {
  if (agent === "studio") {
    return (
      <Encadre titre="📺 Lives TikTok de Frédéric">
        <p>Mardi et vendredi : 11 h à 13 h</p>
        <p>Jeudi : 20 h à 22 h</p>
      </Encadre>
    );
  }
  if (agent === "acheteur") {
    return (
      <Encadre titre="📜 Conditions d'usine">
        <p>25 % à la commande · 25 % · 50 % à la livraison</p>
        <p>ou net 60</p>
      </Encadre>
    );
  }
  if (agent === "agent_pub") {
    return (
      <Encadre titre="🎨 Guide ANRO pour les pubs">
        <div className="mt-1 flex flex-wrap gap-2">
          {[
            ["Charbon", "#0F0A0A"],
            ["Coton", "#FFFFFF"],
            ["Foyer", "#4A1620"],
            ["Braise", "#2F0D14"],
          ].map(([nom, hex]) => (
            <span key={nom} className="flex items-center gap-2 text-sm">
              <span className="size-6 rounded-md border border-bordure" style={{ background: hex }} />
              {nom} {hex}
            </span>
          ))}
        </div>
        <p className="mt-2 text-sm">Police : Fira Sans. L&apos;agence termine fin novembre ; relais le 1er décembre.</p>
      </Encadre>
    );
  }
  if (agent === "ecommerce") {
    return (
      <Encadre titre="🏷️ Règles de promos">
        {PROMOS.map((p) => (
          <p key={p.nom}>
            <strong>{p.nom}</strong> : {formaterDate(p.debut)} au {formaterDate(p.fin)}
          </p>
        ))}
      </Encadre>
    );
  }
  return null;
}

function Encadre({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border-2 border-bordure p-4 text-base">
      <p className="mb-1 font-black">{titre}</p>
      {children}
    </div>
  );
}
