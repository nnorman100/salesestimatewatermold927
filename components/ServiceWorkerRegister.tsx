"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("ADR PWA ServiceWorker registered with scope:", registration.scope);
        })
        .catch((error) => {
          console.warn("ServiceWorker registration skipped or failed:", error);
        });
    }
  }, []);

  return null;
}
