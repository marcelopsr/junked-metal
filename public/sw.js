// Service worker de instalación + shell offline mínimo. El juego está detrás de Cloudflare Access: nunca se guarda una redirección
// (302 a cloudflareaccess.com / opaqueredirect), ni /login, ni respuestas no-OK; si la sesión vence, la navegación llega al login de Access.
const SHELL = "jm-shell-v1", ASSETS = "jm-assets-v1";
const guardable = (res) => res.ok && res.type === "basic" && !res.redirected;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname === "/login" || url.pathname.startsWith("/cdn-cgi/")) return;
  if (req.mode === "navigate") {
    // Red primero: la respuesta real (también el redirect a Access) pasa tal cual. El caché solo cubre estar sin red.
    e.respondWith(fetch(req).then((res) => {
      if (guardable(res)) { const c = res.clone(); caches.open(SHELL).then((s) => s.put("shell", c)); }
      return res;
    }, async () => (await caches.match("shell")) || Response.error()));
  } else if (url.pathname.includes("/assets/")) {
    // Nombres con hash de Vite: inmutables, caché primero.
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (guardable(res)) { const c = res.clone(); caches.open(ASSETS).then((s) => s.put(req, c)); }
      return res;
    })));
  }
});
