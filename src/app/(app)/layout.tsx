import { BarreAgents } from "./barre-agents";

// Écrans réservés aux personnes connectées (le proxy redirige les autres vers /connexion).
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-8 pb-32">{children}</main>
      <BarreAgents />
    </>
  );
}
