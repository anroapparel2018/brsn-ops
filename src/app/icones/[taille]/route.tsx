import { dessinerIcone } from "@/lib/icone";

// Icône de l'app pour l'écran d'accueil du téléphone (192 et 512 pixels).
export function generateStaticParams() {
  return [{ taille: "192" }, { taille: "512" }];
}

export async function GET(_req: Request, { params }: RouteContext<"/icones/[taille]">) {
  const taille = (await params).taille === "512" ? 512 : 192;
  return dessinerIcone(taille);
}
