"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function BoutonDeconnexion() {
  const router = useRouter();

  async function deconnecter() {
    await createClient().auth.signOut();
    router.replace("/connexion");
    router.refresh();
  }

  return (
    <button
      onClick={deconnecter}
      className="mt-10 h-12 w-full rounded-xl border-2 border-bordure text-base font-semibold text-discret"
    >
      Me déconnecter
    </button>
  );
}
