import { Suspense } from "react";
import { lireTachesAFaire, lireTachesFaitesRecemment } from "@/lib/donnees";
import { heureActuelle } from "@/lib/date";
import { VueTaches } from "./vue-taches";

export default function AFaire() {
  return (
    <>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">✅ À faire</p>
      <h1 className="mt-2 text-3xl font-black">Tes tâches</h1>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-carte" />}>
        <Liste />
      </Suspense>
    </>
  );
}

async function Liste() {
  const [taches, faites] = await Promise.all([lireTachesAFaire(), lireTachesFaitesRecemment()]);
  return <VueTaches taches={taches} faites={faites} maintenant={heureActuelle()} />;
}
