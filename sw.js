self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Recordatorio", body: "" };
  event.waitUntil(
    self.registration.showNotification(data.title || "Recordatorio", {
      body: data.body || "",
      tag: data.tag || "reminder",
    })
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("./"));
});
