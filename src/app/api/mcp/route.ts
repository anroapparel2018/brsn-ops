import { nonPermis, requeteMcp } from "@/lib/pont";

// Pont Claude, jeton dans l'en-tête « Authorization: Bearer … » (Claude Code, API).
export async function POST(req: Request) {
  return requeteMcp(req);
}

export const GET = nonPermis;
export const DELETE = nonPermis;
