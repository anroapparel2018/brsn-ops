"use client";

import { useActionState, useEffect, useRef } from "react";
import { ecrireAuCerveau } from "./actions";
import type { MessageCerveau } from "@/lib/donnees";

export function BoiteCerveau({ messages }: { messages: MessageCerveau[] }) {
  const [etat, envoyer, enCours] = useActionState(ecrireAuCerveau, {});
  const formulaire = useRef<HTMLFormElement>(null);

  // Vide la case une fois la réponse reçue.
  useEffect(() => {
    if (!enCours && !etat.erreur) formulaire.current?.reset();
  }, [enCours, etat]);

  return (
    <div className="flex flex-col gap-3">
      {messages.length > 0 && (
        <ul className="flex flex-col gap-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`whitespace-pre-wrap rounded-2xl p-4 text-base ${
                m.role === "user" ? "ml-8 bg-orange text-white" : "mr-4 bg-carte"
              }`}
            >
              {m.contenu}
            </li>
          ))}
        </ul>
      )}
      {enCours && (
        <p className="mr-4 rounded-2xl bg-carte p-4 text-base text-discret">
          🧠 Le Cerveau réfléchit…
        </p>
      )}
      <form ref={formulaire} action={envoyer} className="flex flex-col gap-3">
        <textarea
          name="message"
          required
          rows={3}
          maxLength={4000}
          placeholder="Écris au Cerveau…"
          className="rounded-xl border-2 border-bordure bg-fond p-3 text-lg outline-none focus:border-orange"
        />
        <button
          type="submit"
          disabled={enCours}
          className="h-14 rounded-xl bg-orange text-lg font-bold text-white active:scale-[0.98] disabled:opacity-60"
        >
          {enCours ? "Envoi…" : "Envoyer au Cerveau"}
        </button>
        {etat.erreur && <p className="text-base text-orange">{etat.erreur}</p>}
      </form>
    </div>
  );
}
