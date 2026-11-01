"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

// Dictée vocale du navigateur (Web Speech API), en français du Québec.
// Chrome, Edge et Safari la fournissent ; ailleurs, le bouton micro est caché.

type Resultat = { isFinal: boolean; 0: { transcript: string } };
type Reconnaissance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<Resultat> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};
type Constructeur = new () => Reconnaissance;

function constructeur(): Constructeur | undefined {
  const w = window as unknown as { SpeechRecognition?: Constructeur; webkitSpeechRecognition?: Constructeur };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const rien = () => () => {};

function estIphone() {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function useMicro({
  surTexte,
  surFin,
}: {
  surTexte: (texte: string) => void; // texte reconnu jusqu'ici
  surFin: (texte: string) => void; // appelé quand l'écoute s'arrête
}) {
  const disponible = useSyncExternalStore(rien, () => !!constructeur(), () => false);
  const [ecoute, setEcoute] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const reco = useRef<Reconnaissance | null>(null);
  const texte = useRef("");

  const demarrer = useCallback(
    (depart: string) => {
      const Reco = constructeur();
      if (!Reco) return;
      const r = new Reco();
      r.lang = "fr-CA";
      // Sur iPhone, l'écoute continue ne renvoie souvent rien : on écoute une phrase à la fois.
      r.continuous = !estIphone();
      r.interimResults = true;
      texte.current = depart;
      let codeErreur = "";

      r.onresult = (e) => {
        let dit = "";
        for (let i = 0; i < e.results.length; i++) dit += e.results[i][0].transcript;
        texte.current = [depart, dit.trim()].filter(Boolean).join(" ");
        surTexte(texte.current);
      };
      r.onerror = (e) => {
        codeErreur = e.error;
      };
      r.onend = () => {
        setEcoute(false);
        reco.current = null;
        if (codeErreur === "not-allowed" || codeErreur === "service-not-allowed") {
          setErreur("Le micro est bloqué. Autorise-le dans Réglages > Safari > Micro.");
        } else if (texte.current === depart && codeErreur !== "aborted") {
          // Rien capté : on le dit au lieu de ne rien faire.
          setErreur(
            `Je n'ai rien entendu${codeErreur ? ` (code : ${codeErreur})` : ""}. Réessaie, ou touche la case et utilise le 🎤 du clavier.`,
          );
        }
        surFin(texte.current);
      };

      setErreur(null);
      reco.current = r;
      try {
        r.start();
        setEcoute(true);
      } catch {
        reco.current = null;
        setErreur("Le micro n'a pas pu démarrer. Touche la case et utilise le 🎤 du clavier.");
      }
    },
    [surTexte, surFin],
  );

  const arreter = useCallback(() => reco.current?.stop(), []);

  return { disponible, ecoute, erreur, demarrer, arreter };
}

// Lecture à voix haute d'une réponse.
export function lireAVoixHaute(texte: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const phrase = new SpeechSynthesisUtterance(texte);
  phrase.lang = "fr-CA";
  window.speechSynthesis.speak(phrase);
}
