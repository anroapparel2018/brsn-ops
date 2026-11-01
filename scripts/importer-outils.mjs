// Copie les anciens outils (anciens-outils/*.html) dans public/outils/ en ajoutant le pont BRSN OPS.
// Utilisation : node scripts/importer-outils.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const source = "anciens-outils";
const cible = path.join("public", "outils");
mkdirSync(cible, { recursive: true });

const PONT = '<script src="/outils/pont.js"></script>';
let n = 0;
for (const fichier of readdirSync(source)) {
  if (!fichier.endsWith(".html") || fichier.includes("(")) continue; // ignore les doublons « (1) »
  let html = readFileSync(path.join(source, fichier), "utf8");
  if (!html.includes(PONT)) {
    const tete = html.match(/<head[^>]*>/i);
    html = tete ? html.replace(tete[0], `${tete[0]}\n${PONT}`) : `${PONT}\n${html}`;
  }
  writeFileSync(path.join(cible, fichier), html);
  n++;
}
console.log(`${n} outils importés dans ${cible}`);
