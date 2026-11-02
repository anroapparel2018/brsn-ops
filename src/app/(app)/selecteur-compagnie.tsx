"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changerCompagnie } from "./actions-compagnie";

type C = { id: string; nom: string; logo_url: string | null };

const Pastille = ({ c, taille = "size-9" }: { c: C; taille?: string }) =>
  c.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={c.logo_url} alt="" className={`${taille} shrink-0 rounded-lg object-cover`} />
  ) : (
    <span className={`${taille} flex shrink-0 items-center justify-center rounded-lg bg-orange text-sm font-black text-white`}>
      {c.nom.slice(0, 2).toUpperCase()}
    </span>
  );

// En-tête de chaque écran : compagnie active (sélecteur), cloche de notifications, profil.
export function EnTete({
  active,
  compagnies,
  nonLues,
  initiale,
  superAdmin,
}: {
  active: C;
  compagnies: C[];
  nonLues: number;
  initiale: string;
  superAdmin: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, demarrer] = useTransition();
  const chemin = usePathname();
  const router = useRouter();

  // Retour : page précédente, ou l'écran parent si on est arrivé directement (lien, app rouverte).
  function retour() {
    if (window.history.length > 1) router.back();
    else router.push(chemin.replace(/\/outils\/[^/]+$/, "").split("/").slice(0, chemin.includes("/outils/") ? undefined : -1).join("/") || "/");
  }

  return (
    <>
      <header className="mb-6 flex items-center gap-2">
        {chemin !== "/" && (
          <button
            onClick={retour}
            aria-label="Retour"
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-3xl leading-none active:scale-95"
          >
            ‹
          </button>
        )}
        <button
          onClick={() => setOuvert(true)}
          disabled={compagnies.length < 2 && !superAdmin}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 text-left"
          aria-label="Changer de compagnie"
        >
          <Pastille c={active} />
          <span className="truncate text-base font-black">{active.nom}</span>
          {(compagnies.length > 1 || superAdmin) && <span className="text-discret">▾</span>}
        </button>
        <Link href="/notifications" aria-label="Notifications" className="relative flex size-11 items-center justify-center rounded-xl text-2xl">
          🔔
          {nonLues > 0 && (
            <span className="absolute top-0 right-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-alerte px-1 text-xs font-black text-white">
              {nonLues}
            </span>
          )}
        </Link>
        <Link href="/reglages" aria-label="Mon profil" className="flex size-11 items-center justify-center rounded-full bg-carte text-base font-black">
          {initiale}
        </Link>
      </header>

      {ouvert && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={() => setOuvert(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={`max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-fond p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${enCours ? "opacity-60" : ""}`}
          >
            <h2 className="mb-4 text-2xl font-black">Mes compagnies</h2>
            <ul className="flex flex-col gap-2">
              {compagnies.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() =>
                      demarrer(async () => {
                        await changerCompagnie(c.id);
                        setOuvert(false);
                      })
                    }
                    className={`flex h-16 w-full items-center gap-3 rounded-2xl border-2 px-3 text-left text-lg font-bold ${
                      c.id === active.id ? "border-orange" : "border-bordure"
                    }`}
                  >
                    <Pastille c={c} taille="size-10" />
                    <span className="truncate">{c.nom}</span>
                    {c.id === active.id && <span className="ml-auto text-orange">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
            {superAdmin && (
              <Link
                href="/compagnies"
                onClick={() => setOuvert(false)}
                className="mt-4 flex h-14 items-center justify-center rounded-2xl bg-orange text-lg font-bold text-white"
              >
                Gérer mes compagnies
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
