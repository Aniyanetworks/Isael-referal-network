/** Registers the PWA service worker (see public/sw.js). No-op in dev
 * (vite dev server doesn't need it and it can mask live-reload changes) and
 * in any browser without SW support. */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability degrades gracefully - the app still works without
      // a service worker, it just won't be installable.
    });
  });
}
