import { dessinerIcone } from "@/lib/icone";

// Icône utilisée par l'iPhone quand on ajoute l'app à l'écran d'accueil.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return dessinerIcone(180);
}
