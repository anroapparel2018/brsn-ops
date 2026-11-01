// Date du jour à l'heure du Québec, au format AAAA-MM-JJ.
export function aujourdhui() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montreal" }).format(new Date());
}

// Ex. « dimanche 1 novembre »
export function jourEnLettres() {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "America/Montreal",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}
