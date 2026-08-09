"use client";

import { useEffect } from "react";

export default function PushServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      console.log("Service Worker není v tomto prohlížeči podporovaný.");
      return;
    }

    async function registerServiceWorker() {
      try {
        const registration =
          await navigator.serviceWorker.register("/sw.js");

        console.log(
          "Push Service Worker zaregistrován:",
          registration.scope
        );
      } catch (error) {
        console.error(
          "Registrace Service Workeru selhala:",
          error
        );
      }
    }

    registerServiceWorker();
  }, []);

  return null;
}