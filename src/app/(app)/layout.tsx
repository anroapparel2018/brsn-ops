import { Suspense } from "react";
import { lireApprobationsEnAttente, lireRappelsDus } from "@/lib/donnees";
import { BarreAgents } from "./barre-agents";
import { BanniereRappels } from "./banniere-rappels";
import { BoutonNote } from "./bouton-note";
import { SynchroAuto } from "./synchro-auto";

// Écrans réservés aux personnes connectées (le proxy redirige les autres vers /connexion).
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-48">
        <Suspense>
          <Rappels />
        </Suspense>
        {children}
      </main>
      <BoutonNote />
      <SynchroAuto />
      <Suspense fallback={<BarreAgents />}>
        <Barre />
      </Suspense>
    </>
  );
}

async function Rappels() {
  return <BanniereRappels rappels={await lireRappelsDus()} />;
}

async function Barre() {
  const { total } = await lireApprobationsEnAttente();
  return <BarreAgents enAttente={total} />;
}
