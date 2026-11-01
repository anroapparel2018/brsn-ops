import { Suspense } from "react";
import { getUser } from "@/lib/supabase/server";
import { BoutonDeconnexion } from "./deconnexion";

// Accueil : l'écran du Cerveau. Priorités, approbations et boîte de message arrivent à la prochaine étape.
export default function Accueil() {
  return (
    <>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">🧠 Le Cerveau</p>
      <Suspense fallback={<h1 className="mt-2 text-3xl font-black">Salut&nbsp;!</h1>}>
        <Salutation />
      </Suspense>
      <div className="mt-8 rounded-2xl bg-carte p-6">
        <p className="text-lg font-bold">Tu es connecté ✅</p>
        <p className="mt-2 text-base text-discret">
          Tes priorités du jour, les approbations en attente et la boîte pour écrire au Cerveau
          s&apos;afficheront ici très bientôt.
        </p>
      </div>
      <BoutonDeconnexion />
    </>
  );
}

async function Salutation() {
  const user = await getUser();
  const prenom = user?.email?.startsWith("julien") ? "Julien" : "";
  return <h1 className="mt-2 text-3xl font-black">Salut {prenom}&nbsp;!</h1>;
}
