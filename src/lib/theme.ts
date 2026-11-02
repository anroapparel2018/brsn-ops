// Moteur de thème : couleurs de la marque de la compagnie active → variables CSS.
// Contraste minimum 4,5:1 : une couleur trop pâle ou trop foncée est ajustée automatiquement.
// Les couleurs de STATUT (rouge, orange, rose, vert, bleu, violet, jaune) ne passent jamais par ici.

type Rgb = [number, number, number];

const versRgb = (hex: string): Rgb | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const versHex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

const luminance = ([r, g, b]: Rgb) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

export function contraste(a: string, b: string) {
  const x = versRgb(a);
  const y = versRgb(b);
  if (!x || !y) return 1;
  const [l1, l2] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Rapproche une couleur du blanc (sur fond foncé) ou du noir (sur fond pâle) jusqu'à 4,5:1.
export function ajusterContraste(couleur: string, fond: string, cible = 4.5) {
  const c = versRgb(couleur);
  const f = versRgb(fond);
  if (!c || !f) return { couleur, ajustee: false };
  if (contraste(couleur, fond) >= cible) return { couleur, ajustee: false };
  const vers: Rgb = luminance(f) < 0.5 ? [255, 255, 255] : [0, 0, 0];
  for (let t = 0.05; t <= 1; t += 0.05) {
    const m = c.map((v, i) => v + (vers[i] - v) * t) as Rgb;
    if (contraste(versHex(m), fond) >= cible) return { couleur: versHex(m), ajustee: true };
  }
  return { couleur: versHex(vers), ajustee: true };
}

export type MarqueTheme = {
  couleurs?: Partial<Record<"principale" | "secondaire" | "fond" | "surface" | "texte" | "accent", string>>;
  polices?: { titres?: string; texte?: string };
};

const DEFAUT = { fond: "#141414", texte: "#f6f4f1", carte: "#1f1f1f", accent: "#cc5500" };

// Variables CSS du thème + avertissements de contraste (affichés à l'admin dans « Image de marque »).
export function themeDeMarque(m: MarqueTheme | null | undefined) {
  const c = m?.couleurs ?? {};
  const avertissements: string[] = [];
  const fond = versRgb(c.fond ?? "") ? c.fond! : DEFAUT.fond;
  let texte = versRgb(c.texte ?? "") ? c.texte! : DEFAUT.texte;
  if (contraste(texte, fond) < 4.5) {
    texte = ajusterContraste(texte, fond).couleur;
    avertissements.push("Le texte était peu lisible sur le fond : il a été ajusté.");
  }
  const brute = c.accent ?? c.principale ?? DEFAUT.accent;
  const accentTexte = ajusterContraste(versRgb(brute) ? brute : DEFAUT.accent, fond);
  if (accentTexte.ajustee) avertissements.push("La couleur principale était peu lisible sur le fond : une version plus contrastée sert pour le texte.");
  const accentBouton = versRgb(brute) ? brute : DEFAUT.accent;
  const surface = versRgb(c.surface ?? "") ? c.surface! : melanger(fond, texte, 0.06);

  const police = m?.polices?.texte?.toLowerCase().includes("fira") ? "var(--font-fira)" : "var(--font-archivo)";
  const policeTitres = m?.polices?.titres?.toLowerCase().includes("fira") ? "var(--font-fira)" : police;

  return {
    vars: {
      "--fond": fond,
      "--texte": texte,
      "--carte": surface,
      "--bordure": melanger(fond, texte, 0.14),
      "--discret": melanger(texte, fond, 0.35),
      "--orange": accentTexte.couleur, // texte et liens d'accent (lisibles)
      "--accent-bouton": accentBouton, // fond des boutons principaux
      "--accent-sur-bouton": contraste("#ffffff", accentBouton) >= 4.5 ? "#ffffff" : "#141414",
      "--police": police,
      "--police-titres": policeTitres,
    } as Record<string, string>,
    avertissements,
  };
}

function melanger(a: string, b: string, t: number) {
  const x = versRgb(a) ?? [20, 20, 20];
  const y = versRgb(b) ?? [246, 244, 241];
  return versHex(x.map((v, i) => v + (y[i] - v) * t) as Rgb);
}
