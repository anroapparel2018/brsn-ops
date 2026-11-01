import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { categoriser } from "@/lib/categories-agenda";

// Google Agenda : lecture, et création d'événements SEULEMENT après l'approbation de Julien
// (une demande approuvée dans l'app). L'app ne modifie et ne supprime jamais un événement existant.
// Les jetons sont chiffrés (AES-256-GCM) avec JETONS_CLE.

export const PORTEE = "https://www.googleapis.com/auth/calendar.readonly";
export const PORTEE_ECRITURE = "https://www.googleapis.com/auth/calendar.events";

export function googlePret() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.JETONS_CLE);
}

function cle() {
  const k = Buffer.from(process.env.JETONS_CLE ?? "", "base64");
  if (k.length !== 32) throw new Error("JETONS_CLE invalide");
  return k;
}

export function chiffrer(texte: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cle(), iv);
  const donnees = Buffer.concat([c.update(texte, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), donnees].map((b) => b.toString("base64")).join(".");
}

export function dechiffrer(paquet: string) {
  const [iv, tag, donnees] = paquet.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", cle(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(donnees), d.final()]).toString("utf8");
}

export function urlConnexion(origine: string, etat: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${origine}/api/google/retour`,
    response_type: "code",
    scope: `${PORTEE} ${PORTEE_ECRITURE}`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state: etat,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

type Jetons = { access_token: string; expires_in: number; refresh_token?: string; scope?: string };

async function jetons(corps: Record<string, string>): Promise<Jetons> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...corps,
    }),
  });
  if (!r.ok) throw new Error(`Google a refusé (${r.status})`);
  return r.json();
}

export const echangerCode = (code: string, origine: string) =>
  jetons({ code, grant_type: "authorization_code", redirect_uri: `${origine}/api/google/retour` });

export const rafraichir = (jetonRafraichissement: string) =>
  jetons({ refresh_token: jetonRafraichissement, grant_type: "refresh_token" });

// Jeton d'accès valide (rafraîchi au besoin). Retourne aussi le nouveau jeton chiffré à garder.
export async function jetonValide(compte: {
  jeton_rafraichissement: string;
  jeton_acces: string | null;
  expire_le: string | null;
}) {
  if (compte.jeton_acces && compte.expire_le && new Date(compte.expire_le).getTime() > Date.now() + 60_000) {
    return { acces: dechiffrer(compte.jeton_acces), nouveau: null };
  }
  const j = await rafraichir(dechiffrer(compte.jeton_rafraichissement));
  return {
    acces: j.access_token,
    nouveau: { jeton_acces: chiffrer(j.access_token), expire_le: new Date(Date.now() + j.expires_in * 1000).toISOString() },
  };
}

// Période synchronisée : 5 semaines en arrière, 4 mois en avant (pour la vue Mois).
export function periode() {
  const debut = new Date(Date.now() - 35 * 86_400_000);
  debut.setUTCHours(0, 0, 0, 0);
  const fin = new Date(debut.getTime() + 155 * 86_400_000);
  return { debut: debut.toISOString(), fin: fin.toISOString() };
}

export type DemandeAgenda = {
  titre: string;
  debut: string;
  fin: string;
  journee_entiere: boolean;
  lieu: string | null;
  invites: string[];
  meet: boolean;
  description: string | null;
};

// Crée l'événement dans Google Agenda. Appelée UNIQUEMENT quand Julien approuve une demande.
export async function creerEvenementGoogle(acces: string, d: DemandeAgenda, idDemande: string) {
  const jour = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montreal" }).format(new Date(iso));
  const corps = {
    summary: d.titre,
    location: d.lieu ?? undefined,
    description: d.description ?? undefined,
    start: d.journee_entiere ? { date: jour(d.debut) } : { dateTime: d.debut, timeZone: "America/Montreal" },
    end: d.journee_entiere ? { date: jour(d.fin) } : { dateTime: d.fin, timeZone: "America/Montreal" },
    attendees: d.invites.length ? d.invites.map((email) => ({ email })) : undefined,
    conferenceData: d.meet
      ? { createRequest: { requestId: idDemande, conferenceSolutionKey: { type: "hangoutsMeet" } } }
      : undefined,
  };
  const p = new URLSearchParams({
    conferenceDataVersion: d.meet ? "1" : "0",
    sendUpdates: d.invites.length ? "all" : "none",
  });
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${p}`, {
    method: "POST",
    headers: { authorization: `Bearer ${acces}`, "content-type": "application/json" },
    body: JSON.stringify(corps),
  });
  if (r.status === 403) throw new Error("permission");
  if (!r.ok) throw new Error(`Google a refusé (${r.status})`);
  return ((await r.json()) as { id: string }).id;
}

type EvenementGoogle = {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  description?: string;
  hangoutLink?: string;
  htmlLink?: string;
  conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
  attendees?: { email: string; displayName?: string; responseStatus?: string; self?: boolean }[];
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
};

export type EvenementLigne = {
  google_id: string;
  debut: string;
  fin: string;
  journee_entiere: boolean;
  titre: string;
  lieu: string | null;
  meet: string | null;
  description: string | null;
  invites: { nom: string; reponse?: string }[];
  lien_google: string | null;
  categorie_auto: string;
};

// Journée entière : on la place à l'heure du Québec (minuit, -05:00).
const jourVersIso = (jour: string) => new Date(`${jour}T00:00:00-05:00`).toISOString();

export async function lireEvenements(acces: string, debut: string, fin: string): Promise<EvenementLigne[]> {
  const lignes: EvenementLigne[] = [];
  let page: string | undefined;
  do {
    const p = new URLSearchParams({
      timeMin: debut,
      timeMax: fin,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
      ...(page ? { pageToken: page } : {}),
    });
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${p}`, {
      headers: { authorization: `Bearer ${acces}` },
    });
    if (!r.ok) throw new Error(`Lecture de l'agenda impossible (${r.status})`);
    const j = (await r.json()) as { items?: EvenementGoogle[]; nextPageToken?: string };
    for (const e of j.items ?? []) {
      if (e.status === "cancelled") continue;
      const invites = (e.attendees ?? [])
        .filter((a) => !a.self)
        .map((a) => ({ nom: a.displayName || a.email, reponse: a.responseStatus }));
      const titre = e.summary?.trim() || "(sans titre)";
      lignes.push({
        google_id: e.id,
        debut: e.start.dateTime ?? jourVersIso(e.start.date!),
        fin: e.end.dateTime ?? jourVersIso(e.end.date!),
        journee_entiere: !e.start.dateTime,
        titre,
        lieu: e.location ?? null,
        meet:
          e.hangoutLink ?? e.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri ?? null,
        description: e.description ?? null,
        invites,
        lien_google: e.htmlLink ?? null,
        categorie_auto: categoriser(titre, invites.length > 0),
      });
    }
    page = j.nextPageToken;
  } while (page);
  return lignes;
}
