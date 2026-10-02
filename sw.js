/* 苏云汐 PWA service worker：缓存应用外壳，聊天数据走网络 */
const CACHE = "suyunxi-v7";
const SHELL = ["icon-192.png", "icon-512.png",
               "icon-180.png", "avatar.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  // 导航页/HTML 必须优先走网络，避免 iOS PWA 一直吃旧版 index.html。
  if (e.request.mode === "navigate" || u.pathname.endsWith("/index.html")) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // 聊天/语音/TTS 永远走网络。
  if (u.pathname.startsWith("/ws") || u.pathname.startsWith("/api/")) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      if (resp.ok && e.request.method === "GET") {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return resp;
    }))
  );
});
