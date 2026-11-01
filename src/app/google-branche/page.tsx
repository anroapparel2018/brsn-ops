import { Suspense } from "react";

const MESSAGES: Record<string, [string, string]> = {
  ok: ["✅ Ton agenda Google est branché", "Retourne dans l'app BRSN OPS (icône de ton écran d'accueil) : tes événements arrivent dans l'onglet Agenda."],
  refus: ["Connexion annulée", "Tu as annulé dans Google. Retourne dans l'app et réessaie."],
  securite: ["La connexion a expiré", "Retourne dans l'app BRSN OPS et touche de nouveau « Connecter mon agenda Google »."],
  jeton: ["Il manque une permission", "Retourne dans l'app et réessaie : accepte la lecture de l'agenda."],
  permission: ["Il manque une permission", "Il faut accepter « Afficher les événements de vos agendas »."],
  google: ["Google a refusé la connexion", "Réessaie dans un moment depuis l'app BRSN OPS."],
};

// Page de fin de connexion Google (souvent ouverte dans Safari, sans session : rien de privé ici).
export default function GoogleBranche({ searchParams }: PageProps<"/google-branche">) {
  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">BRSN OPS · Agenda</p>
        <Suspense>
          <Message searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Message({ searchParams }: { searchParams: PageProps<"/google-branche">["searchParams"] }) {
  const r = String((await searchParams).resultat ?? "");
  const [titre, texte] = MESSAGES[r] ?? MESSAGES.securite;
  return (
    <>
      <h1 className="mt-3 text-3xl font-black">{titre}</h1>
      <p className="mt-3 text-lg text-discret">{texte}</p>
      <a href="/agenda" className="mt-8 flex h-14 items-center justify-center rounded-xl bg-orange text-lg font-bold text-white">
        Ouvrir l&apos;agenda
      </a>
      <p className="mt-3 text-sm text-discret">
        Si tu es dans Safari, ce bouton peut te demander de te connecter : ouvre plutôt l&apos;app depuis son icône.
      </p>
    </>
  );
}
