import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages accessibles sans être connecté.
const PAGES_PUBLIQUES = ["/connexion", "/auth/confirm", "/auth/callback"];

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Un lien de Supabase qui arrive ailleurs que prévu (ex. la page d'accueil) : on le redirige vers la confirmation.
  if (searchParams.has("code") && pathname !== "/auth/confirm") {
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
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icones/|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
