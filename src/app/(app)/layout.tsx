import { Suspense } from "react";
import { lireApprobationsEnAttente, lireDemandesAgenda, lireRappelsDus } from "@/lib/donnees";
import { compagnieActive, mesCompagnies } from "@/lib/compagnie";
import { createClient } from "@/lib/supabase/server";
import { themeDeMarque } from "@/lib/theme";
import { BarreAgents } from "./barre-agents";
import { BanniereRappels } from "./banniere-rappels";
import { SynchroAuto } from "./synchro-auto";
import { EnTete } from "./selecteur-compagnie";
import { ZoneRetour } from "./retour";

// Écrans réservés aux personnes connectées (le proxy redirige les autres vers /connexion).
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense>
        <Theme />
      </Suspense>
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-48">
        <Suspense fallback={<div className="mb-6 h-12 animate-pulse rounded-xl bg-carte" />}>
          <Entete />
        </Suspense>
        <Suspense>
          <Rappels />
        </Suspense>
        {children}
      </main>
      <ZoneRetour />
      <SynchroAuto />
      <Suspense fallback={<BarreAgents />}>
        <Barre />
      </Suspense>
    </>
  );
}

// Couleurs et polices de la compagnie active (les couleurs de statut ne changent jamais).
async function Theme() {
  const c = await compagnieActive();
  if (!c?.marque) return null;
  const sombre = themeDeMarque(c.marque);
  const clair = themeDeMarque({ ...c.marque, couleurs: { ...c.marque.couleurs, fond: "#ffffff", texte: "#141414", surface: "#f4f2ef" } });
  const css = (v: Record<string, string>, garder?: string[]) =>
    Object.entries(v)
      .filter(([k]) => !garder || garder.includes(k))
      .map(([k, val]) => `${k}:${val}`)
      .join(";");
  const accents = ["--orange", "--accent-bouton", "--accent-sur-bouton", "--police", "--police-titres"];
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root:not(.clair){${css(sombre.vars)}}:root.clair{${css(clair.vars, accents)}}`,
      }}
    />
  );
}

async function Entete() {
  const [c, { compagnies, superAdmin, user }] = await Promise.all([compagnieActive(), mesCompagnies()]);
  if (!c || !user) return null;
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("compagnie_id", c.id)
    .eq("lue", false);
  return (
    <EnTete
      active={{ id: c.id, nom: c.nom, logo_url: c.logo_url }}
      compagnies={compagnies.map((x) => ({ id: x.id, nom: x.nom, logo_url: x.logo_url }))}
      nonLues={count ?? 0}
      initiale={(user.email ?? "?").slice(0, 1).toUpperCase()}
      superAdmin={superAdmin}
    />
  );
}

async function Rappels() {
  return <BanniereRappels rappels={await lireRappelsDus()} />;
}

async function Barre() {
  const [{ total }, demandes] = await Promise.all([lireApprobationsEnAttente(), lireDemandesAgenda()]);
  return <BarreAgents enAttente={total + demandes.length} />;
}
