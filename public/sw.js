self.addEventListener("push", (event) => {
  const data = event.data
    ? event.data.json()
    : {};

  const title =
    data.title || "Pájova Tip Liga";

  const options = {
    body:
      data.message ||
      "Máš nové oznámení.",
    icon:
      "/images/logo-pajova-tip-liga.png",
    badge:
      "/images/logo-pajova-tip-liga.png",
    data: {
      url:
        data.url || "/dashboard",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const url =
      event.notification.data?.url ||
      "/dashboard";

    event.waitUntil(
      clients.openWindow(url)
    );
  }
);