/* Service worker aplikacji Portfel Ethereum.
   Powłoka (HTML, ikony, manifest) idzie z cache — aplikacja otwiera się natychmiast
   i uruchamia bez sieci. Dane rynkowe zawsze próbujemy pobrać z sieci;
   z cache korzystamy tylko wtedy, gdy sieci nie ma, i oznaczamy je jako nieaktualne. */

var VERSION = "eth-portfel-v2";
var SHELL_CACHE = VERSION + "-shell";
var DATA_CACHE = VERSION + "-data";

var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k !== SHELL_CACHE && k !== DATA_CACHE) return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function isApi(url) {
  // news.json też traktujemy jak dane: zawsze próbujemy pobrać świeży,
  // inaczej cache powłoki serwowałby stare wiadomości w nieskończoność
  return /api\.crypto\.com|api\.nbp\.pl|api\.coingecko\.com|api\.coinbase\.com|news\.json/.test(url);
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  // Dane rynkowe: sieć najpierw, cache jako zapas przy braku połączenia.
  if (isApi(req.url)) {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(DATA_CACHE).then(function (c) { c.put(req, copy); });
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            if (hit) {
              // kopia z cache — dokładamy nagłówek, żeby aplikacja wiedziała
              return hit.blob().then(function (b) {
                var h = new Headers(hit.headers);
                h.set("X-From-Cache", "1");
                return new Response(b, { status: 200, headers: h });
              });
            }
            return new Response('{"error":"offline"}', {
              status: 503,
              headers: { "Content-Type": "application/json" }
            });
          });
        })
    );
    return;
  }

  // Powłoka: cache najpierw, w tle odświeżana.
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(SHELL_CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
