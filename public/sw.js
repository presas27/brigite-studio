/**
 * The studio's service worker. It exists so the app counts as installable
 * everywhere that still asks for one, and it deliberately caches nothing:
 * every screen is a live view of the deployment, a session can be revoked at
 * any moment, and a stale cached page would be a page lying about both.
 *
 * Network only. When there is no network, the browser's own offline page is
 * the honest answer.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
