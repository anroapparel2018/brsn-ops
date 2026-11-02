import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { envoyerPush, pushDisponible } from "@/lib/push";
import { aujourdhui } from "@/lib/date";

// Tâche planifiée de Vercel (chaque matin) : chaque appareil reçoit SES rappels et événements du jour.
// Protégée par CRON_SECRET. Désactivée tant que PUSH_ACTIF n'est pas « 1 » (approbation de Julien).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  }
  if (process.env.PUSH_ACTIF !== "1") return NextResponse.json({ envoyes: 0, raison: "push désactivé" });
  if (!pushDisponible()) return NextResponse.json({ erreur: "Clés de notification manquantes" }, { status: 503 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const jour = aujourdhui();
  const { data, error } = await supabase.rpc("rappels_du_jour", {
    secret,
    debut: `${jour}T00:00:00-05:00`,
    fin: `${jour}T23:59:59-05:00`,
  });
  if (error) return NextResponse.json({ erreur: "Lecture impossible" }, { status: 500 });

  const heure = (iso: string) =>
    new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Montreal", hour: "numeric", minute: "2-digit" }).format(
      new Date(iso),
    );
  type Ligne = {
    abonnement: { endpoint: string; abonnement: Parameters<typeof envoyerPush>[0][number]["abonnement"] };
    rappels: { titre: string; rappel_le: string }[];
    evenements: { titre: string; debut: string; journee_entiere: boolean }[];
  };

  let envoyes = 0;
  for (const l of (data ?? []) as Ligne[]) {
    if (!l.rappels.length && !l.evenements.length) continue;
    const lignes = [
      ...l.evenements.slice(0, 5).map((e) => `📅 ${e.journee_entiere ? "Journée" : heure(e.debut)} · ${e.titre}`),
      ...l.rappels.slice(0, 5).map((r) => `⏰ ${heure(r.rappel_le)} · ${r.titre}`),
    ];
    const r = await envoyerPush([l.abonnement], {
      titre: `Ta journée : ${l.evenements.length} événement(s), ${l.rappels.length} rappel(s)`,
      texte: lignes.join("\n"),
      url: "/a-faire",
      tag: `rappels-${jour}`,
    });
    envoyes += r.envoyes;
  }
  return NextResponse.json({ envoyes });
}
