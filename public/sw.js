// Service worker de BRSN OPS : reçoit les notifications (rappels) et ouvre l'app au toucher.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { titre: "BRSN OPS", texte: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(d.titre || "BRSN OPS", {
      body: d.texte || "",
      icon: "/icones/192",
      badge: "/icones/192",
      data: { url: d.url || "/" },
      tag: d.tag,
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const f of fenetres) {
        if ("focus" in f) {
          f.navigate(url);
          return f.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
