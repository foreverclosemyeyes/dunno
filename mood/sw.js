// 오프라인에서도 열리도록 앱 파일을 저장해 둔다.
// 인터넷이 될 때는 항상 최신 파일을 먼저 받아오고, 안 될 때만 저장본을 쓴다.
// 앱 파일을 바꿔서 올릴 때마다 CACHE 숫자를 하나 올린다. js/ 에 파일을 더하면 JS 목록에도 더한다.
const CACHE = 'tide-v26';
const JS = ['main', 'config', 'i18n', 'constants', 'store', 'dates', 'theme', 'icons', 'dom', 'state', 'meds', 'analysis', 'files', 'render',
  'views/today', 'views/trend', 'views/insight', 'views/record', 'views/settings'];
const FILES = ['./', 'index.html', 'app.css', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', ...JS.map((n) => `js/${n}.js`)];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
  );
});
