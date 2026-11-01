"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useMicro } from "./micro";
import { classerNote, creerNote, transformerNote, type Suggestion } from "./actions-taches";
import { FormulaireTache } from "./a-faire/formulaire-tache";

// ISO → valeur d'un champ « datetime-local » (heure du téléphone).
function versLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const TYPES = { tache: "une tâche", rappel: "un rappel", decision: "une décision", note: "une note à garder" };

// Bouton « + Note » flottant, sur tous les écrans : on dicte ou on écrit, puis le Cerveau propose quoi en faire.
export function BoutonNote() {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, demarrer] = useTransition();
  const [resultat, setResultat] = useState<{ id: string; texte: string; suggestion: Suggestion | null } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const zone = useRef<HTMLTextAreaElement>(null);
  const parVoix = useRef(false);

  const surTexte = useCallback((t: string) => {
    if (zone.current) zone.current.value = t;
  }, []);
  const surFin = useCallback((t: string) => {
    if (t.trim()) parVoix.current = true;
  }, []);
  const micro = useMicro({ surTexte, surFin });

  function fermer() {
    if (micro.ecoute) micro.arreter();
    setOuvert(false);
    setResultat(null);
    setErreur(null);
    parVoix.current = false;
  }

  function enregistrer() {
    const texte = zone.current?.value.trim() ?? "";
    if (!texte) return;
    demarrer(async () => {
      const res = await creerNote(texte, parVoix.current ? "vocal" : "texte");
      if ("erreur" in res && res.erreur) setErreur(res.erreur);
      else if ("id" in res && res.id) setResultat({ id: res.id, texte, suggestion: res.suggestion ?? null });
    });
  }

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        aria-label="Ajouter une note"
        className="fixed right-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-20 flex h-16 items-center gap-2 rounded-full bg-orange px-5 text-lg font-black text-white shadow-lg active:scale-95"
      >
        + Note
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/60" onClick={fermer}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-fond p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">📝 Note rapide</h2>
              <button onClick={fermer} className="h-11 rounded-xl px-3 text-base font-semibold text-discret">
                Fermer
              </button>
            </div>

            {!resultat ? (
              <div className="mt-4 flex flex-col gap-3">
                {micro.disponible && (
                  <button
                    type="button"
                    onClick={() => (micro.ecoute ? micro.arreter() : micro.demarrer(zone.current?.value ?? ""))}
                    className={`h-16 rounded-2xl text-xl font-black text-white ${
                      micro.ecoute ? "animate-pulse bg-encre ring-4 ring-orange" : "bg-orange"
                    }`}
                  >
                    {micro.ecoute ? "⏹ Arrêter" : "🎤 Dicter"}
                  </button>
                )}
                {micro.erreur && <p className="text-base text-orange">{micro.erreur}</p>}
                <textarea
                  ref={zone}
                  rows={4}
                  autoFocus={!micro.disponible}
                  placeholder={micro.ecoute ? "Je t'écoute…" : "Écris ou dicte ta note (🎤 du clavier)…"}
                  className="rounded-xl border-2 border-bordure bg-fond p-3 text-lg outline-none focus:border-orange"
                />
                <button
                  onClick={enregistrer}
                  disabled={enCours || micro.ecoute}
                  className="h-14 rounded-xl bg-orange text-lg font-bold text-white disabled:opacity-60"
                >
                  {enCours ? "Le Cerveau regarde ta note…" : "Enregistrer la note"}
                </button>
                {erreur && <p className="text-base text-orange">{erreur}</p>}
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                <p className="rounded-xl bg-carte p-3 text-base">✅ Note enregistrée : « {resultat.texte} »</p>
                {resultat.suggestion ? (
                  <p className="text-base">
                    🧠 Le Cerveau propose d&apos;en faire <strong>{TYPES[resultat.suggestion.type]}</strong>.{" "}
                    <span className="text-discret">{resultat.suggestion.pourquoi}</span>
                  </p>
                ) : (
                  <p className="text-base text-discret">Veux-tu en faire une tâche ?</p>
                )}
                <FormulaireTache
                  libelle="Créer la tâche"
                  initial={{
                    titre: resultat.suggestion?.titre ?? resultat.texte.slice(0, 200),
                    agent: resultat.suggestion?.agent,
                    categorie: resultat.suggestion?.categorie,
                    rappelLocal: versLocal(resultat.suggestion?.rappel_le ?? null),
                  }}
                  envoyer={(t) => transformerNote(resultat.id, t)}
                  surFin={fermer}
                />
                <button
                  onClick={() => demarrer(async () => {
                    await classerNote(resultat.id);
                    fermer();
                  })}
                  className="h-12 rounded-xl border-2 border-bordure text-base font-bold"
                >
                  Garder comme simple note
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
