"use client";

import { useState, useTransition } from "react";
import { themeDeMarque } from "@/lib/theme";
import { choisirAgents, creerCompagnie, enregistrerMarque, extraireMarque, preparerInvitations, type ProfilMarque } from "./actions";

type Modele = { cle: string; nom: string; icone: string; role: string };
const ETAPES = ["Nom", "Guide", "Aperçu", "Agents", "Équipe"];
const champ = "h-12 w-full rounded-xl border-2 border-bordure bg-fond px-3 text-base outline-none focus:border-orange";
const COULEURS = ["principale", "secondaire", "fond", "surface", "texte", "accent"] as const;

// Réduit une image (max 1400 px) et la donne en base64, pour la lecture du guide.
async function versBase64(f: File) {
  const url = URL.createObjectURL(f);
  const img = new Image();
  await new Promise((ok, ko) => {
    img.onload = ok;
    img.onerror = ko;
    img.src = url;
  });
  const k = Math.min(1, 1400 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return { type: "image/jpeg", donnees: c.toDataURL("image/jpeg", 0.85).split(",")[1] };
}

// Assistant « Nouvelle compagnie » en 5 étapes (une par écran). On peut quitter : la compagnie reste créée.
export function Assistant({ modeles }: { modeles: Modele[] }) {
  const [ouvert, setOuvert] = useState(false);
  const [etape, setEtape] = useState(0);
  const [id, setId] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [profil, setProfil] = useState<ProfilMarque>({ couleurs: { principale: "#CC5500", fond: "#141414", texte: "#F6F4F1" }, polices: {}, voix: "" });
  const [agents, setAgents] = useState<string[]>(modeles.map((m) => m.cle));
  const [invites, setInvites] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const theme = themeDeMarque(profil);

  const suivant = () => {
    setMessage(null);
    setEtape((e) => e + 1);
  };

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} className="mt-6 h-14 w-full rounded-2xl bg-orange text-lg font-bold text-white">
        + Nouvelle compagnie
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border-2 border-orange p-4">
      <div className="mb-4 flex gap-1" aria-label={`Étape ${etape + 1} sur 5`}>
        {ETAPES.map((e, i) => (
          <div key={e} className="flex-1">
            <div className={`h-2 rounded-full ${i <= etape ? "bg-orange" : "bg-bordure"}`} />
            <p className={`mt-1 text-center text-xs font-semibold ${i === etape ? "" : "text-discret"}`}>{e}</p>
          </div>
        ))}
      </div>

      {etape === 0 && (
        <form
          action={(f) =>
            demarrer(async () => {
              const r = await creerCompagnie(String(f.get("nom")), String(f.get("logo") || "") || null);
              if (r.erreur) setMessage(r.erreur);
              else {
                setId(r.id!);
                setNom(String(f.get("nom")));
                suivant();
              }
            })
          }
          className="flex flex-col gap-3"
        >
          <h2 className="text-xl font-black">Nom de la compagnie</h2>
          <input name="nom" required placeholder="Ex. Wide the Brand" className={champ} />
          <input name="logo" type="url" placeholder="Lien du logo (facultatif)" className={champ} />
          <button disabled={enCours} className="h-14 rounded-xl bg-orange text-lg font-bold text-white disabled:opacity-60">
            {enCours ? "Création…" : "Créer et continuer"}
          </button>
        </form>
      )}

      {etape === 1 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-black">Guide de marque</h2>
          <p className="text-base text-discret">
            Dépose les pages du guide (images ou captures d&apos;écran du PDF). L&apos;app propose les couleurs, les polices
            et la voix.
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const fichiers = [...(e.target.files ?? [])];
              demarrer(async () => {
                const images = await Promise.all(fichiers.map(versBase64));
                const r = await extraireMarque(images);
                if (r.erreur) setMessage(r.erreur);
                else {
                  setProfil(r.profil!);
                  suivant();
                }
              });
            }}
            className="text-base"
          />
          {enCours && <p className="text-base">Lecture du guide…</p>}
          <button onClick={suivant} className="h-12 rounded-xl border-2 border-bordure text-base font-bold">
            Passer : j&apos;entre les couleurs à la main
          </button>
        </div>
      )}

      {etape === 2 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-black">Aperçu</h2>
          <div
            className="rounded-2xl p-4"
            style={{ background: theme.vars["--fond"], color: theme.vars["--texte"], fontFamily: profil.polices.texte || undefined }}
          >
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: theme.vars["--orange"] }}>
              {nom || "Compagnie"}
            </p>
            <p className="text-2xl font-black" style={{ fontFamily: profil.polices.titres || undefined }}>
              Salut la famille !
            </p>
            <div className="mt-3 rounded-xl p-3" style={{ background: theme.vars["--carte"] }}>
              Une carte de l&apos;app, avec du texte normal.
            </div>
            <div
              className="mt-3 flex h-12 items-center justify-center rounded-xl font-bold"
              style={{ background: theme.vars["--accent-bouton"], color: theme.vars["--accent-sur-bouton"] }}
            >
              Bouton principal
            </div>
          </div>
          {theme.avertissements.map((a) => (
            <p key={a} className="rounded-xl border-l-4 border-l-alerte bg-alerte-fond p-3 text-sm">
              ⚠️ {a}
            </p>
          ))}
          <div className="grid grid-cols-2 gap-2">
            {COULEURS.map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm font-semibold capitalize">
                <input
                  type="color"
                  value={profil.couleurs[k] || "#888888"}
                  onChange={(e) => setProfil({ ...profil, couleurs: { ...profil.couleurs, [k]: e.target.value } })}
                  className="size-10 rounded-lg"
                />
                {k}
              </label>
            ))}
          </div>
          <input
            value={profil.polices.titres ?? ""}
            onChange={(e) => setProfil({ ...profil, polices: { ...profil.polices, titres: e.target.value } })}
            placeholder="Police des titres"
            className={champ}
          />
          <input
            value={profil.polices.texte ?? ""}
            onChange={(e) => setProfil({ ...profil, polices: { ...profil.polices, texte: e.target.value } })}
            placeholder="Police du texte"
            className={champ}
          />
          <textarea
            value={profil.voix}
            onChange={(e) => setProfil({ ...profil, voix: e.target.value })}
            rows={3}
            placeholder="Voix de la marque (ton des agents)"
            className="rounded-xl border-2 border-bordure bg-fond p-3 text-base outline-none focus:border-orange"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => demarrer(async () => void (await enregistrerMarque(id!, profil, false)))}
              className="h-12 rounded-xl border-2 border-bordure text-base font-bold"
            >
              À changer plus tard
            </button>
            <button
              onClick={() =>
                demarrer(async () => {
                  const r = await enregistrerMarque(id!, profil, true);
                  if (r.erreur) setMessage(r.erreur);
                  else suivant();
                })
              }
              className="h-12 rounded-xl bg-orange text-base font-bold text-white"
            >
              ✓ Approuver
            </button>
          </div>
        </div>
      )}

      {etape === 3 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-black">Agents</h2>
          <button
            onClick={() => setAgents(agents.length === modeles.length ? [] : modeles.map((m) => m.cle))}
            className="h-11 rounded-xl border-2 border-bordure text-base font-bold"
          >
            {agents.length === modeles.length ? "Tout décocher" : "Tous"}
          </button>
          <ul className="grid grid-cols-2 gap-2">
            {modeles.map((m) => {
              const choisi = agents.includes(m.cle);
              return (
                <li key={m.cle}>
                  <button
                    onClick={() => setAgents(choisi ? agents.filter((c) => c !== m.cle) : [...agents, m.cle])}
                    className={`flex h-16 w-full items-center gap-2 rounded-xl border-2 px-2 text-left text-sm font-bold ${
                      choisi ? "border-orange" : "border-bordure opacity-60"
                    }`}
                  >
                    <span className="text-2xl">{m.icone}</span>
                    {m.nom}
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const r = await choisirAgents(id!, agents);
                if (r.erreur) setMessage(r.erreur);
                else suivant();
              })
            }
            className="h-14 rounded-xl bg-orange text-lg font-bold text-white disabled:opacity-60"
          >
            Continuer
          </button>
        </div>
      )}

      {etape === 4 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-black">Équipe</h2>
          <p className="text-base text-discret">
            Une personne par ligne : courriel, puis rôle (admin, employe ou client). Les invitations restent en brouillon
            jusqu&apos;à ton approbation : aucun courriel ne part.
          </p>
          <textarea
            value={invites}
            onChange={(e) => setInvites(e.target.value)}
            rows={4}
            placeholder={"marie@exemple.com, employe\nclient@exemple.com, client"}
            className="rounded-xl border-2 border-bordure bg-fond p-3 text-base outline-none focus:border-orange"
          />
          <button
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const lignes = invites
                  .split("\n")
                  .map((l) => l.split(/[,;\t]/).map((x) => x.trim()))
                  .filter(([c]) => c)
                  .map(([courriel, role]) => ({ courriel, role: role || "employe" }));
                const r = await preparerInvitations(id!, lignes);
                if (r.erreur) setMessage(r.erreur);
                else {
                  setMessage(`✅ ${nom} est prête. ${r.nombre ?? 0} invitation(s) en brouillon.`);
                  setEtape(5);
                }
              })
            }
            className="h-14 rounded-xl bg-orange text-lg font-bold text-white disabled:opacity-60"
          >
            Terminer
          </button>
        </div>
      )}

      {message && <p className="mt-3 text-base">{message}</p>}
      <button
        onClick={() => {
          setOuvert(false);
          setEtape(0);
          setId(null);
        }}
        className="mt-4 h-11 w-full rounded-xl text-base font-semibold text-discret"
      >
        {etape >= 5 ? "Fermer" : "Quitter (reprendre plus tard)"}
      </button>
    </div>
  );
}
