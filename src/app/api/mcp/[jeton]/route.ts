import { nonPermis, requeteMcp } from "@/lib/pont";

// Pont Claude, jeton dans le lien (connecteur personnalisé de claude.ai, aussi sur iPhone).
export async function POST(req: Request, ctx: RouteContext<"/api/mcp/[jeton]">) {
  return requeteMcp(req, (await ctx.params).jeton);
}

export const GET = nonPermis;
export const DELETE = nonPermis;
