"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient, envoyerLienMagique } from "@/lib/supabase/client";

type Etat = "pret" | "envoi" | "envoye" | "erreur" | "limite" | "mauvais_mdp";

export function FormulaireConnexion() {
  const lienExpire = useSearchParams().get("erreur") === "lien";
  const [courriel, setCourriel] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [etat, setEtat] = useState<Etat>("pret");

  // Un lien d'invitation arrive ici avec la session après le # : on le passe à /auth/callback.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token") || hash.includes("error")) {
      window.location.replace(`/auth/callback${hash}`);
    }
  }, []);

  async function connecter(e: React.FormEvent) {
    e.preventDefault();
    setEtat("envoi");
    const { error } = await createClient().auth.signInWithPassword({
      email: courriel.trim(),
      password: motDePasse,
    });
    if (error) {
      setEtat("mauvais_mdp");
      return;
    }
    // Rechargement complet pour que le serveur voie la nouvelle session.
    window.location.replace("/");
  }

  async function envoyerLien() {
    if (!courriel.trim()) {
      setEtat("erreur");
      return;
    }
    setEtat("envoi");
    const { error } = await envoyerLienMagique(courriel.trim());
    if (!error) setEtat("envoye");
    // Supabase limite le nombre de courriels envoyés par heure.
    else if (error.status === 429 || error.code === "over_email_send_rate_limit") setEtat("limite");
    else setEtat("erreur");
  }

  if (etat === "envoye") {
    return (
      <div className="mt-8 rounded-2xl bg-carte p-6">
        <p className="text-2xl font-bold">📬 Regarde tes courriels</p>
        <p className="mt-2 text-lg text-discret">
          Clique sur le lien « Log In » envoyé à{" "}
          <strong className="text-texte">{courriel}</strong>.
        </p>
        <button
          onClick={() => setEtat("pret")}
          className="mt-6 text-base font-semibold text-orange underline"
        >
          Revenir
        </button>
      </div>
    );
  }

  const champ =
    "h-14 rounded-xl border-2 border-bordure bg-fond px-4 text-lg outline-none focus:border-orange";

  return (
    <form onSubmit={connecter} className="mt-8 flex flex-col gap-4">
      {lienExpire && etat === "pret" && (
        <p className="rounded-xl bg-carte p-4 text-base">
          Ce lien ne fonctionne plus. Connecte-toi avec ton mot de passe ou demande un nouveau lien.
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
          className={champ}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-base font-semibold">Ton mot de passe</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className={champ}
        />
      </label>
      <button
        type="submit"
        disabled={etat === "envoi"}
        className="h-14 rounded-xl bg-orange text-lg font-bold text-white active:scale-[0.98] disabled:opacity-60"
      >
        {etat === "envoi" ? "Un instant…" : "Me connecter"}
      </button>
      {etat === "mauvais_mdp" && (
        <p className="text-base text-orange">Courriel ou mot de passe incorrect.</p>
      )}

      <button
        type="button"
        onClick={envoyerLien}
        disabled={etat === "envoi"}
        className="mt-2 text-base font-semibold text-discret underline disabled:opacity-60"
      >
        Pas de mot de passe ? Recevoir un lien par courriel
      </button>
      {etat === "erreur" && (
        <p className="text-base text-orange">
          Impossible d&apos;envoyer le lien. Vérifie ton courriel : seuls les comptes autorisés
          peuvent se connecter.
        </p>
      )}
      {etat === "limite" && (
        <p className="text-base text-orange">
          Trop de liens demandés en peu de temps. Attends un peu (jusqu&apos;à une heure) et
          réessaie, ou connecte-toi avec ton mot de passe.
        </p>
      )}
    </form>
  );
}
