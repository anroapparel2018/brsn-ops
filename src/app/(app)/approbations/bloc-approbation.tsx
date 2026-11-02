"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { trouverAgent } from "@/lib/agents";
import { decider } from "./actions";

export type Approbation = {
  id: string;
  compagnie_id: string;
  agent: string;
  titre: string;
  details: string | null;
  statut: "en_attente" | "approuve" | "a_changer";
  commentaire: string | null;
  photo: string | null;
  cree_le: string;
  decide_le: string | null;
};

const quand = (iso: string) =>
  new Intl.DateTimeFormat("fr-CA", {
    timeZone: "America/Montreal",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

// Un bloc à décider : Approuver / À changer, commentaire, photo, puis Envoyer.
export function BlocApprobation({ a }: { a: Approbation }) {
  const [choix, setChoix] = useState<"approuve" | "a_changer" | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [photo, setPhoto] = useState<{ chemin: string; apercu: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, demarrer] = useTransition();
  const [televersement, setTeleversement] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const agent = trouverAgent(a.agent);

  async function joindrePhoto(f: File) {
    setTeleversement(true);
    setMessage(null);
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const chemin = `${a.compagnie_id}/${a.id}/${Date.now()}.${ext || "jpg"}`;
    const { error } = await createClient()
      .storage.from("photos-approbations")
      .upload(chemin, f, { contentType: f.type || "image/jpeg" });
    setTeleversement(false);
    if (error) setMessage("La photo n'a pas pu être envoyée. Réessaie.");
    else setPhoto({ chemin, apercu: URL.createObjectURL(f) });
  }

  function envoyer() {
    if (!choix) return setMessage("Choisis Approuver ou À changer.");
    demarrer(async () => {
      const res = await decider(a.id, choix, commentaire, photo?.chemin ?? null);
      if (res.erreur) setMessage(res.erreur);
    });
  }

  return (
    <li className={`rounded-2xl bg-carte p-5 ${envoi ? "opacity-60" : ""}`}>
      <p className="text-sm font-semibold text-discret">
        {agent?.icone} {agent?.nom} · {quand(a.cree_le)}
      </p>
      <p className="mt-1 text-xl font-bold">{a.titre}</p>
      {a.details && <p className="mt-2 whitespace-pre-wrap text-base">{a.details}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setChoix("approuve")}
          className={`h-14 rounded-xl border-2 text-lg font-bold ${
            choix === "approuve" ? "border-green-600 bg-green-600 text-white" : "border-bordure"
          }`}
        >
          ✓ Approuver
        </button>
        <button
          onClick={() => setChoix("a_changer")}
          className={`h-14 rounded-xl border-2 text-lg font-bold ${
            choix === "a_changer" ? "border-orange bg-orange text-white" : "border-bordure"
          }`}
        >
          À changer
        </button>
      </div>

      {choix && (
        <textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          rows={3}
          placeholder={choix === "a_changer" ? "Qu'est-ce qu'il faut changer ?" : "Commentaire (facultatif)"}
          className="mt-3 w-full rounded-xl border-2 border-bordure bg-fond p-3 text-base outline-none focus:border-orange"
        />
      )}

      <input
        ref={fichier}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => e.target.files?.[0] && joindrePhoto(e.target.files[0])}
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => fichier.current?.click()}
          disabled={televersement}
          className="h-12 rounded-xl border-2 border-bordure px-4 text-base font-bold"
        >
          {televersement ? "Envoi de la photo…" : photo ? "📷 Changer la photo" : "📷 Caméra"}
        </button>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.apercu} alt="Photo jointe" className="h-12 w-12 rounded-lg object-cover" />
        )}
      </div>

      <button
        onClick={envoyer}
        disabled={envoi || televersement}
        className="mt-4 h-14 w-full rounded-xl bg-orange text-lg font-bold text-white active:scale-[0.98] disabled:opacity-60"
      >
        {envoi ? "Envoi…" : "Envoyer"}
      </button>
      {message && <p className="mt-2 text-base text-orange">{message}</p>}
    </li>
  );
}

export function LigneHistorique({ a }: { a: Approbation }) {
  const agent = trouverAgent(a.agent);
  return (
    <li className="rounded-2xl bg-carte p-4">
      <p className="text-sm font-semibold text-discret">
        {agent?.icone} {agent?.court} · {a.decide_le && quand(a.decide_le)}
      </p>
      <p className="mt-1 text-base font-bold">{a.titre}</p>
      <p className={`mt-1 text-base font-bold ${a.statut === "approuve" ? "text-green-600" : "text-orange"}`}>
        {a.statut === "approuve" ? "✓ Approuvé" : "À changer"}
        {a.photo ? " · 📷 photo jointe" : ""}
      </p>
      {a.commentaire && <p className="mt-1 text-base text-discret">« {a.commentaire} »</p>}
    </li>
  );
}
