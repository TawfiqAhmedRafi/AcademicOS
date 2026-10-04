"use client";

import { useEffect } from "react";

/** Registers the service worker (production only) so the app becomes installable. */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.error("Service worker registration failed", err);
    });
  }, []);

  return null;
}
