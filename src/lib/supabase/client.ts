import { createBrowserClient } from "@supabase/ssr";
import { createClient as createClientSimple } from "@supabase/supabase-js";

// Client Supabase pour le navigateur (composants "use client").
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

// Envoie le lien magique en mode « implicite » : la session revient dans le lien lui-même,
// donc pas besoin de l'ouvrir dans le même navigateur (et pas besoin de modifier le courriel de Supabase).
export function envoyerLienMagique(email: string) {
  const supabase = createClientSimple(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  return supabase.auth.signInWithOtp({
    email,
    options: {
      // Personne ne peut se créer un compte ici : seulement les comptes invités.
      shouldCreateUser: false,
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}
