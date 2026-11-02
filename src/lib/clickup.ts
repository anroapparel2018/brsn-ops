import "server-only";
import { cacheLife, cacheTag } from "next/cache";

// ClickUp (espace ANRO APPAREL). Liste POOL = « 📥 À TRIER (boîte de réception) ».
// Lecture du POOL pour les priorités ; écritures seulement quand Julien trie (Accepter, Reporter, Supprimer)
// ou accepte une alerte (nouvelle tâche dans le POOL).
const API = "https://api.clickup.com/api/v2";
export const LISTE_POOL = process.env.CLICKUP_POOL_LIST ?? "901421797778";
export const TAG_POOL = "clickup-pool";
const ETIQUETTE_ARCHIVE = "archivé brsn ops";

export type TacheClickUp = {
  id: string;
  titre: string;
  statut: string;
  priorite: "urgent" | "high" | "normal" | "low" | null;
  echeance: string | null; // AAAA-MM-JJ (heure de Montréal)
  url: string;
};

export const clickupPret = () => !!process.env.CLICKUP_TOKEN;

async function appel(chemin: string, init?: RequestInit) {
  const res = await fetch(`${API}${chemin}`, {
    ...init,
    headers: { Authorization: process.env.CLICKUP_TOKEN!, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ClickUp ${res.status}`);
  return res.json();
}

const jourMontreal = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montreal" }).format(new Date(ms));

// Tâches ouvertes du POOL (mises en cache quelques minutes ; rafraîchies après chaque tri).
export async function lirePool(): Promise<TacheClickUp[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAG_POOL);
  if (!clickupPret()) return [];
  const taches: TacheClickUp[] = [];
  for (let page = 0; page < 5; page++) {
    const j = await appel(`/list/${LISTE_POOL}/task?page=${page}&subtasks=false&include_closed=false`);
    for (const t of j.tasks as {
      id: string;
      name: string;
      status: { status: string };
      priority: { priority: string } | null;
      due_date: string | null;
      url: string;
      tags: { name: string }[];
    }[]) {
      if (t.tags?.some((x) => x.name === ETIQUETTE_ARCHIVE)) continue;
      taches.push({
        id: t.id,
        titre: t.name,
        statut: t.status.status,
        priorite: (t.priority?.priority as TacheClickUp["priorite"]) ?? null,
        echeance: t.due_date ? jourMontreal(Number(t.due_date)) : null,
        url: t.url,
      });
    }
    if (j.last_page) break;
  }
  return taches;
}

// 9 h à Montréal, le jour choisi (heure d'hiver ou d'été gérée par l'API Intl).
function neufHeures(jour: string) {
  const essai = new Date(`${jour}T14:00:00Z`);
  const heure = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montreal", hour: "numeric", hourCycle: "h23" }).format(essai));
  return essai.getTime() - (heure - 9) * 3_600_000;
}

export async function accepterDansClickUp(id: string) {
  await appel(`/task/${id}`, { method: "PUT", body: JSON.stringify({ status: "in progress" }) });
}

export async function reporterDansClickUp(id: string, jour: string) {
  await appel(`/task/${id}`, { method: "PUT", body: JSON.stringify({ due_date: neufHeures(jour), due_date_time: true }) });
}

// « Supprimer » : rien n'est effacé dans ClickUp ; la tâche reçoit une étiquette et sort des priorités.
export async function archiverDansClickUp(id: string) {
  await appel(`/task/${id}/tag/${encodeURIComponent(ETIQUETTE_ARCHIVE)}`, { method: "POST" });
}

export async function restaurerDansClickUp(id: string) {
  await appel(`/task/${id}/tag/${encodeURIComponent(ETIQUETTE_ARCHIVE)}`, { method: "DELETE" });
}

// Nouvelle tâche dans le POOL, statut de départ (à trier), sans date limite.
export async function creerDansPool(nom: string, description: string): Promise<{ id: string; url: string }> {
  const t = await appel(`/list/${LISTE_POOL}/task`, {
    method: "POST",
    body: JSON.stringify({ name: nom.slice(0, 250), markdown_content: description, status: "to do" }),
  });
  return { id: t.id, url: t.url };
}
