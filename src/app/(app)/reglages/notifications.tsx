"use client";

import { useState, useTransition } from "react";
import { enregistrerAbonnement, envoyerTest } from "./actions";

function versOctets(base64: string) {
  const b = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

// Active les notifications de rappel sur cet appareil (iPhone : l'app doit être installée sur l'écran d'accueil).
export function Notifications() {
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function activer() {
    demarrer(async () => {
      const cle = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setMessage("Cet appareil ne gère pas les notifications. Sur iPhone : installe d'abord l'app sur l'écran d'accueil, puis ouvre-la depuis l'icône.");
        return;
      }
      if (!cle) {
        setMessage("Les notifications ne sont pas encore configurées (clé manquante dans Vercel).");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Permission refusée. Autorise les notifications dans Réglages > Notifications > BRSN OPS.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const abo =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(cle) }));
      const res = await enregistrerAbonnement(JSON.parse(JSON.stringify(abo)));
      setMessage(res.erreur ?? "✅ Notifications activées sur cet appareil.");
    });
  }

  function tester() {
    demarrer(async () => {
      const res = await envoyerTest();
      setMessage(res.erreur ?? "Notification envoyée : regarde ton écran.");
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-base text-discret">
        Reçois tes rappels du jour chaque matin à 7 h. Les rappels à l&apos;heure exacte s&apos;affichent aussi en
        rouge dans l&apos;app.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={activer} disabled={enCours} className="h-12 rounded-xl bg-orange text-base font-bold text-white disabled:opacity-60">
          🔔 Activer
        </button>
        <button onClick={tester} disabled={enCours} className="h-12 rounded-xl border-2 border-bordure text-base font-bold disabled:opacity-60">
          Envoyer un test
        </button>
      </div>
      {message && <p className="text-base">{message}</p>}
    </div>
  );
}
