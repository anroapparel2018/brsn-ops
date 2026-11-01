// Définit le mot de passe d'un compte BRSN OPS sans envoyer de courriel.
// Utilisation : npm run mot-de-passe
// Lit SUPABASE_SECRET_KEY dans .env.local (jamais sur GitHub). Le mot de passe tapé n'est pas affiché.
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cleSecrete = process.env.SUPABASE_SECRET_KEY;

if (!url || !cleSecrete) {
  console.error("❌ Il manque SUPABASE_SECRET_KEY (ou l'adresse Supabase) dans .env.local.");
  process.exit(1);
}

function demander(question, cache = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (cache) {
      // N'affiche rien pendant qu'on tape le mot de passe.
      rl._writeToOutput = (texte) => {
        if (texte.includes(question)) rl.output.write(texte);
      };
    }
    rl.question(question, (reponse) => {
      rl.close();
      if (cache) process.stdout.write("\n");
      resolve(reponse);
    });
  });
}

const supabase = createClient(url, cleSecrete, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const courriel = (await demander("Courriel du compte : ")).trim().toLowerCase();
const { data, error: erreurListe } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (erreurListe) {
  console.error("❌ Impossible de lire les comptes :", erreurListe.message);
  process.exit(1);
}
const compte = data.users.find((u) => u.email?.toLowerCase() === courriel);
if (!compte) {
  console.error(`❌ Aucun compte trouvé pour ${courriel}.`);
  process.exit(1);
}

const mdp = await demander("Nouveau mot de passe (12 caractères ou plus) : ", true);
if (mdp.length < 12) {
  console.error("❌ Trop court : utilise au moins 12 caractères.");
  process.exit(1);
}
const confirmation = await demander("Retape le mot de passe : ", true);
if (mdp !== confirmation) {
  console.error("❌ Les deux mots de passe ne sont pas pareils. Recommence.");
  process.exit(1);
}

const { error } = await supabase.auth.admin.updateUserById(compte.id, { password: mdp });
if (error) {
  console.error("❌ Supabase a refusé :", error.message);
  process.exit(1);
}
console.log(`✅ Mot de passe enregistré pour ${courriel}. Tu peux te connecter.`);
