"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { mesCompagnies, TEMOIN_COMPAGNIE } from "@/lib/compagnie";
import { createClient } from "@/lib/supabase/server";

// Changer de compagnie active (le choix est revérifié : seulement mes compagnies).
export async function changerCompagnie(id: string) {
  const { compagnies } = await mesCompagnies();
  if (!compagnies.some((c) => c.id === id)) return { erreur: "Compagnie introuvable." };
  (await cookies()).set(TEMOIN_COMPAGNIE, id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  refresh();
  return {};
}

// Notifications : marquer comme lues (une ou toutes).
export async function marquerNotificationsLues(id?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  let q = supabase.from("notifications").update({ lue: true, maj_le: new Date().toISOString() }).eq("user_id", user.id);
  if (id) q = q.eq("id", id);
  await q;
  refresh();
}
