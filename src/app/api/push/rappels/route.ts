import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { envoyerPush, pushDisponible } from "@/lib/push";
import { aujourdhui } from "@/lib/date";

// Tâche planifiée de Vercel (chaque matin) : envoie la liste des rappels du jour sur le téléphone.
// Protégée par CRON_SECRET (Vercel l'envoie dans l'en-tête Authorization).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  }
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

  const rappels = (data?.rappels ?? []) as { titre: string; rappel_le: string }[];
  if (!rappels.length || !data?.abonnements?.length) return NextResponse.json({ envoyes: 0 });

  const heure = (iso: string) =>
    new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Montreal", hour: "numeric", minute: "2-digit" }).format(
      new Date(iso),
    );
  const { envoyes } = await envoyerPush(data.abonnements, {
    titre: `⏰ ${rappels.length} rappel${rappels.length > 1 ? "s" : ""} aujourd'hui`,
    texte: rappels
      .slice(0, 5)
      .map((r) => `${heure(r.rappel_le)} · ${r.titre}`)
      .join("\n"),
    url: "/a-faire",
    tag: `rappels-${jour}`,
  });
  return NextResponse.json({ envoyes });
}
