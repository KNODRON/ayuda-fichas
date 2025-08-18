const CACHE = "reminders-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then(r => r || fetch(req))
  );
});

// Opcional: manejar clics en notificaciones
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (allClients.length > 0) {
        allClients[0].focus();
      } else {
        await self.clients.openWindow("./");
      }
    })()
  );
});
