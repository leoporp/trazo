// Service worker de Trazo: guarda la app para abrirla sin internet (en el gym)
// y siempre intenta traer la versión más nueva primero. No toca tus datos.
const CACHE = "trazo-shell-v2";
const SHELL = ["./", "./index.html", "./config.js", "./vendor/supabase.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png",
  "./fonts/oswald-latin-500-normal.woff2", "./fonts/oswald-latin-600-normal.woff2", "./fonts/archivo-latin-400-normal.woff2",
  "./fonts/archivo-latin-600-normal.woff2", "./fonts/archivo-latin-700-normal.woff2", "./fonts/jetbrains-mono-latin-500-normal.woff2"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase: directo a la red
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === "navigate" ? caches.match("./index.html") : undefined)))
  );
});
