import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages accessibles sans être connecté.
// (/api/push/rappels : tâche planifiée de Vercel, protégée par son propre secret.)
const PAGES_PUBLIQUES = [
  "/connexion",
  "/auth/confirm",
  "/auth/callback",
  "/api/push/rappels",
  "/api/agenda/synchro", // synchro planifiée, protégée par son jeton
  "/api/google/retour", // retour de Google (souvent dans Safari), protégé par l'état secret
  "/google-branche",
];

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Un lien de Supabase qui arrive ailleurs que prévu (ex. la page d'accueil) : on le redirige vers la confirmation.
  // (Le retour de Google Agenda a aussi un « code », mais il a sa propre route.)
  if (searchParams.has("code") && pathname !== "/auth/confirm" && !pathname.startsWith("/api/google/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Rafraîchit la session et vérifie qui est connecté.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const estPublique = PAGES_PUBLIQUES.some((p) => pathname.startsWith(p));

  if (!user && !estPublique) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/connexion") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Toutes les pages, sauf les fichiers statiques et les images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icones/|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
