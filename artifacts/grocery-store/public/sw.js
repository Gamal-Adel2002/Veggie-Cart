self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {}

  // Pick language based on browser locale; fall back to English
  const isAr = (self.navigator && self.navigator.language || "").startsWith("ar");

  const title = (isAr && data.titleAr) ? data.titleAr : (data.title || "FreshVeg");
  const body  = (isAr && data.bodyAr)  ? data.bodyAr  : (data.body  || "");
  const url   = data.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: { url },
      tag: "freshveg-notification",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              client.navigate(url);
            }
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
