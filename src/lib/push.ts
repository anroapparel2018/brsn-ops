import "server-only";
import webpush from "web-push";

// Envoi des notifications Web Push (clés VAPID dans .env.local et Vercel, jamais dans le code).
export function pushDisponible() {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function envoyerPush(
  abonnements: { endpoint: string; abonnement: webpush.PushSubscription }[],
  message: { titre: string; texte: string; url?: string; tag?: string },
) {
  webpush.setVapidDetails(
    "mailto:julien@anroapparel.ca",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const expires: string[] = [];
  let envoyes = 0;
  await Promise.all(
    abonnements.map(async (a) => {
      try {
        await webpush.sendNotification(a.abonnement, JSON.stringify(message));
        envoyes++;
      } catch (e) {
        const statut = (e as { statusCode?: number }).statusCode;
        if (statut === 404 || statut === 410) expires.push(a.endpoint);
        else console.error("Notification :", statut);
      }
    }),
  );
  return { envoyes, expires };
}
