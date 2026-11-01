import { Suspense } from "react";
import { lireApprobations } from "@/lib/donnees";
import { VueApprobations } from "./vue-approbations";
import type { Approbation } from "./bloc-approbation";

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
  const { enAttente, historique } = await lireApprobations();
  return <VueApprobations enAttente={enAttente as Approbation[]} historique={historique as Approbation[]} />;
}
