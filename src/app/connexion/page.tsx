import { Suspense } from "react";
import { FormulaireConnexion } from "./formulaire";

export default function PageConnexion() {
  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">BRSN</p>
        <h1 className="mt-2 text-4xl font-black">OPS</h1>
        <p className="mt-3 text-lg text-discret">
          Entre ton courriel. On t&apos;envoie un lien pour te connecter, sans mot de passe.
        </p>
        <Suspense>
          <FormulaireConnexion />
        </Suspense>
      </div>
    </main>
  );
}
