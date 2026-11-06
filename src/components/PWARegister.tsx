"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("PWA Service Worker active with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("PWA Service Worker registration:", err);
        });
    }
  }, []);

  return null;
}
