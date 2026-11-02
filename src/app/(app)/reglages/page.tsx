import { Suspense } from "react";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { cleDisponible, MODELES } from "@/lib/ia";
import { lireAgenda, lireCoutDuMois } from "@/lib/donnees";
import { ReglageGoogle } from "./google";
import { BoutonDeconnexion } from "../deconnexion";
import { Notifications } from "./notifications";
import { ChoixTheme } from "./theme";

const BRANCHEMENTS = [
  { nom: "Supabase (base de données, connexion)", etat: "connecte" },
  { nom: "Vercel (mise en ligne)", etat: "connecte" },
  { nom: "Claude (API Anthropic)", etat: "cle" },
  { nom: "Shopify", etat: "a_brancher" },
  { nom: "QuickBooks", etat: "a_brancher" },
  { nom: "Outlook", etat: "a_brancher" },
  { nom: "Meta (Facebook, Instagram)", etat: "a_brancher" },
  { nom: "TikTok Ads", etat: "a_brancher" },
  { nom: "Google Drive", etat: "a_brancher" },
  { nom: "Slack", etat: "a_brancher" },
  { nom: "Courriel (SMTP) pour Supabase", etat: "a_brancher" },
];

export default function Reglages() {
  return (
    <>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">⚙️ Réglages</p>
      <h1 className="mt-2 text-3xl font-black">Réglages</h1>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-carte" />}>
        <Contenu />
      </Suspense>
    </>
  );
}

async function Contenu() {
  const user = await getUser();
  const maintenant = new Date().toISOString();
  const [cout, agenda] = await Promise.all([lireCoutDuMois(), lireAgenda(maintenant, maintenant)]);
  const cle = cleDisponible();
  const argent = (n: number) =>
    new Intl.NumberFormat("fr-CA", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

  return (
    <>
      <section className="mt-8 rounded-2xl bg-carte p-5">
        <h2 className="text-xl font-black">Mon profil</h2>
        <p className="mt-2 text-base">{user?.email}</p>
        <p className="text-sm text-discret">Connexion par mot de passe ou lien par courriel.</p>
      </section>

      <section className="mt-6 rounded-2xl bg-carte p-5">
        <h2 className="text-xl font-black">Affichage</h2>
        <ChoixTheme />
      </section>

      <section className="mt-6 rounded-2xl bg-carte p-5">
        <h2 className="text-xl font-black">Coût de Claude ce mois-ci</h2>
        <p className="mt-2 text-4xl font-black text-orange">{argent(cout.cout)}</p>
        <p className="text-base text-discret">
          {cout.appels} appels · {cout.jetons.toLocaleString("fr-CA")} jetons (estimation en $ US).
        </p>
        <p className="mt-2 text-sm text-discret">
          Modèles : {MODELES.complet} (traitements automatiques), {MODELES.rapide} (classement des notes). Mise en cache des
          instructions activée. Limite de dépenses : 50 $ US par mois dans la console Anthropic.
        </p>
      </section>

      <section className="mt-6 rounded-2xl bg-carte p-5">
        <h2 className="text-xl font-black">Google Agenda</h2>
        <ReglageGoogle connecte={agenda.connecte} peutEcrire={agenda.peutEcrire} derniereSynchro={agenda.derniereSynchro} />
      </section>

      <section className="mt-6 rounded-2xl bg-carte p-5">
        <h2 className="text-xl font-black">Notifications</h2>
        <Notifications />
      </section>

      <section className="mt-6 rounded-2xl bg-carte p-5">
        <h2 className="text-xl font-black">Branchements</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {BRANCHEMENTS.map((b) => {
            const ok = b.etat === "connecte" || (b.etat === "cle" && cle);
            return (
              <li key={b.nom} className="flex items-center justify-between gap-3 text-base">
                <span>{b.nom}</span>
                <span className={`shrink-0 text-sm font-bold ${ok ? "text-green-600" : "text-orange"}`}>
                  {ok ? "✅ Connecté" : b.etat === "cle" ? "🔑 Clé manquante" : "🔌 À brancher"}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm text-discret">
          Rien n&apos;est envoyé, payé ou publié chez ces services sans toi. On les branchera ensemble.
        </p>
      </section>

      <section className="mt-6 rounded-2xl bg-carte p-5">
        <h2 className="text-xl font-black">Anciens outils</h2>
        <Link href="/agents/cerveau/outils/cerveau" className="mt-2 block text-base font-bold text-orange">
          Ancien tableau du Cerveau →
        </Link>
      </section>

      <BoutonDeconnexion />
    </>
  );
}
