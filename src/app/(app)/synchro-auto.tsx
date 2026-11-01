"use client";

import { useEffect } from "react";
import { synchroniserSiBesoin } from "./agenda/actions";

// À l'ouverture de l'app (et au retour dans l'app), met l'agenda à jour s'il date de plus de 5 minutes.
export function SynchroAuto() {
  useEffect(() => {
    const lancer = () => {
      if (document.visibilityState === "visible") synchroniserSiBesoin().catch(() => {});
    };
    lancer();
    document.addEventListener("visibilitychange", lancer);
    return () => document.removeEventListener("visibilitychange", lancer);
  }, []);
  return null;
}
