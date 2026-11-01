"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import { ecrireAUnAgent } from "./actions";
import { lireAVoixHaute, useMicro } from "./micro";
import type { MessageAgent } from "@/lib/donnees";

// Conversation avec un agent : on parle (micro) ou on écrit.
// Quand la question a été dictée, la réponse est lue à voix haute.
export function BoiteAgent({
  agent,
  nom,
  messages,
}: {
  agent: string;
  nom: string;
  messages: MessageAgent[];
}) {
  const [etat, envoyer, enCours] = useActionState(ecrireAUnAgent.bind(null, agent), {});
  const formulaire = useRef<HTMLFormElement>(null);
  const zone = useRef<HTMLTextAreaElement>(null);
  const parVoix = useRef(false);

  const surTexte = useCallback((texte: string) => {
    if (zone.current) zone.current.value = texte;
  }, []);
  const surFin = useCallback((texte: string) => {
    if (texte.trim()) {
      parVoix.current = true;
      formulaire.current?.requestSubmit();
    }
  }, []);
  const micro = useMicro({ surTexte, surFin });

  // Réponse reçue : on vide la case et, si la question était dictée, on lit la réponse.
  useEffect(() => {
    if (enCours) return;
    if (!etat.erreur) formulaire.current?.reset();
    if (etat.derniereReponse && parVoix.current) lireAVoixHaute(etat.derniereReponse);
    parVoix.current = false;
  }, [enCours, etat]);

  return (
    <div className="flex flex-col gap-3">
      {messages.length > 0 && (
        <ul className="flex flex-col gap-3">
          {messages.map((m) =>
            m.role === "user" ? (
              <li key={m.id} className="ml-8 whitespace-pre-wrap rounded-2xl bg-orange p-4 text-base text-white">
                {m.contenu}
              </li>
            ) : (
              <li key={m.id} className="mr-4 rounded-2xl bg-carte p-4">
                <p className="whitespace-pre-wrap text-base">{m.contenu}</p>
                <button
                  type="button"
                  onClick={() => lireAVoixHaute(m.contenu)}
                  className="mt-2 text-sm font-semibold text-discret"
                >
                  🔊 Écouter
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      {enCours && (
        <p className="mr-4 rounded-2xl bg-carte p-4 text-base text-discret">{nom} réfléchit…</p>
      )}

      <form ref={formulaire} action={envoyer} className="flex flex-col gap-3">
        {micro.disponible && (
          <button
            type="button"
            disabled={enCours}
            onClick={() => (micro.ecoute ? micro.arreter() : micro.demarrer(zone.current?.value ?? ""))}
            className={`flex h-20 items-center justify-center gap-3 rounded-2xl text-xl font-black text-white active:scale-[0.98] disabled:opacity-60 ${
              micro.ecoute ? "animate-pulse bg-encre ring-4 ring-orange" : "bg-orange"
            }`}
          >
            {micro.ecoute ? "⏹ Terminer et envoyer" : "🎤 Parler"}
          </button>
        )}
        {micro.erreur && <p className="text-base text-orange">{micro.erreur}</p>}

        <textarea
          ref={zone}
          name="message"
          required
          rows={micro.disponible ? 2 : 3}
          maxLength={4000}
          placeholder={micro.ecoute ? "Je t'écoute…" : `Ou écris à ${nom}…`}
          className="rounded-xl border-2 border-bordure bg-fond p-3 text-lg outline-none focus:border-orange"
        />
        <button
          type="submit"
          disabled={enCours || micro.ecoute}
          className="h-14 rounded-xl border-2 border-orange text-lg font-bold text-orange active:scale-[0.98] disabled:opacity-60"
        >
          {enCours ? "Envoi…" : "Envoyer"}
        </button>
        {!micro.disponible && (
          <p className="text-sm text-discret">
            Astuce : touche le 🎤 de ton clavier pour dicter ton message.
          </p>
        )}
        {etat.erreur && <p className="text-base text-orange">{etat.erreur}</p>}
      </form>
    </div>
  );
}
