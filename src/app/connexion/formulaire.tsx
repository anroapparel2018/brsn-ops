"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Etat = "pret" | "envoi" | "envoye" | "erreur";

export function FormulaireConnexion() {
  const lienExpire = useSearchParams().get("erreur") === "lien";
  const [courriel, setCourriel] = useState("");
  const [etat, setEtat] = useState<Etat>("pret");

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEtat("envoi");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: courriel.trim(),
      options: {
        // Personne ne peut se créer un compte ici : seulement les comptes invités.
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setEtat(error ? "erreur" : "envoye");
  }

  if (etat === "envoye") {
    return (
      <div className="mt-8 rounded-2xl bg-carte p-6">
        <p className="text-2xl font-bold">📬 Regarde tes courriels</p>
        <p className="mt-2 text-lg text-discret">
          Clique sur le lien envoyé à <strong className="text-texte">{courriel}</strong>. Ouvre-le
          sur cet appareil-ci.
        </p>
        <button
          onClick={() => setEtat("pret")}
          className="mt-6 text-base font-semibold text-orange underline"
        >
          Changer de courriel
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer} className="mt-8 flex flex-col gap-4">
      {lienExpire && etat === "pret" && (
        <p className="rounded-xl bg-carte p-4 text-base">
          Ce lien ne fonctionne plus. Demande-en un nouveau ci-dessous.
        </p>
      )}
      <label className="flex flex-col gap-2">
        <span className="text-base font-semibold">Ton courriel</span>
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={courriel}
          onChange={(e) => setCourriel(e.target.value)}
          placeholder="toi@anroapparel.ca"
          className="h-14 rounded-xl border-2 border-bordure bg-fond px-4 text-lg outline-none focus:border-orange"
        />
      </label>
      <button
        type="submit"
        disabled={etat === "envoi"}
        className="h-14 rounded-xl bg-orange text-lg font-bold text-white active:scale-[0.98] disabled:opacity-60"
      >
        {etat === "envoi" ? "Envoi…" : "Recevoir mon lien"}
      </button>
      {etat === "erreur" && (
        <p className="text-base text-orange">
          Impossible d&apos;envoyer le lien. Vérifie ton courriel : seuls les comptes autorisés
          peuvent se connecter.
        </p>
      )}
    </form>
  );
}
