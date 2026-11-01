"use client";

import { useTransition } from "react";
import { marquerNotificationsLues } from "../actions-compagnie";

export function BoutonToutLu() {
  const [enCours, demarrer] = useTransition();
  return (
    <button
      onClick={() => demarrer(() => marquerNotificationsLues())}
      disabled={enCours}
      className="mt-4 h-12 w-full rounded-xl border-2 border-bordure text-base font-bold disabled:opacity-60"
    >
      ✓ Tout marquer comme lu
    </button>
  );
}
