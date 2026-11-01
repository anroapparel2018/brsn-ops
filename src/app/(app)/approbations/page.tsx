import { Suspense } from "react";
import { lireApprobations, lireDemandesAgenda } from "@/lib/donnees";
import { VueApprobations } from "./vue-approbations";
import type { Approbation } from "./bloc-approbation";
import { CarteDemande } from "../agenda/fiche-demande";

export default function Approbations() {
  return (
    <>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">📥 Approbations</p>
      <h1 className="mt-2 text-3xl font-black">Ce qui attend ton OK</h1>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-carte" />}>
        <Liste />
      </Suspense>
    </>
  );
}

async function Liste() {
  const [{ enAttente, historique }, demandes] = await Promise.all([lireApprobations(), lireDemandesAgenda()]);
  return (
    <>
      {demandes.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-black">📅 Demandes d&apos;agenda ({demandes.length})</h2>
          <div className="flex flex-col gap-3">
            {demandes.map((d) => (
              <CarteDemande key={d.id} d={d} />
            ))}
          </div>
        </section>
      )}
      <VueApprobations enAttente={enAttente as Approbation[]} historique={historique as Approbation[]} />
    </>
  );
}
