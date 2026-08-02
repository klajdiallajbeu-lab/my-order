// sw.js — "vrasës" për çdo Service Worker të vjetër që përditësohet nga kjo adresë.
// Instalohet menjëherë, ç'regjistron veten dhe rifreskon klientët.
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (e) {}

      await self.registration.unregister();

      const clientsList = await self.clients.matchAll({ type: "window" });
      clientsList.forEach((client) => client.navigate(client.url));
    })()
  );
});