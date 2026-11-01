import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AgentId } from "@/lib/agents";

// Instructions des agents : docs/agents/commun.md + docs/agents/<agent>.md.
// Modifiables sans toucher au code.
const cache = new Map<string, string>();

async function lire(nom: string) {
  if (cache.has(nom)) return cache.get(nom)!;
  try {
    const texte = await readFile(path.join(process.cwd(), "docs", "agents", `${nom}.md`), "utf8");
    cache.set(nom, texte);
    return texte;
  } catch {
    return "";
  }
}

export async function instructionsAgent(agent: AgentId) {
  const [commun, propre] = await Promise.all([lire("commun"), lire(agent)]);
  return [commun, propre].filter(Boolean).join("\n\n");
}
