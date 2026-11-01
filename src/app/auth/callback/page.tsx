"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

// Arrivée du lien magique (courriel par défaut de Supabase) : la session est dans l'adresse, après le #.
// Ça marche peu importe le navigateur où le lien s'ouvre (Chrome, Outlook, téléphone).
export default function Callback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    // Retire les jetons de l'adresse tout de suite (historique, captures d'écran).
    window.history.replaceState(null, "", window.location.pathname);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) {
      window.location.replace("/connexion?erreur=lien");
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { detectSessionInUrl: false } },
    );
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => window.location.replace(error ? "/connexion?erreur=lien" : "/"));
  }, []);

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <p className="text-lg text-discret">Connexion en cours…</p>
    </main>
  );
}
