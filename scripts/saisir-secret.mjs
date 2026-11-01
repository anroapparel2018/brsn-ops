// Inscrit une valeur secrète dans .env.local sans l'afficher.
// Utilisation : node scripts/saisir-secret.mjs NOM_DE_LA_VARIABLE
import { readFileSync, writeFileSync } from "node:fs";
import readline from "node:readline";

const nom = process.argv[2];
if (!/^[A-Z0-9_]+$/.test(nom ?? "")) {
  console.error("Nom de variable invalide.");
  process.exit(1);
}

const question = `Colle la valeur de ${nom} (rien ne s'affiche), puis Entrée : `;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl._writeToOutput = (t) => {
  if (t.includes(question)) rl.output.write(t);
};
rl.question(question, (valeur) => {
  rl.close();
  process.stdout.write("\n");
  valeur = valeur.trim();
  if (!valeur) {
    console.error("❌ Rien n'a été collé. Recommence.");
    process.exit(1);
  }
  let t = readFileSync(".env.local", "utf8");
  const re = new RegExp(`^${nom}=.*$`, "m");
  t = re.test(t) ? t.replace(re, `${nom}=${valeur}`) : `${t.trimEnd()}\n${nom}=${valeur}\n`;
  writeFileSync(".env.local", t);
  console.log(`✅ ${nom} enregistrée (${valeur.length} caractères). Tu peux fermer cet onglet.`);
});
