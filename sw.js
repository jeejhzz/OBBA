/**
 * OBBA 서비스워커 — 홈 화면에 추가했을 때 오프라인에서도 열리게 한다.
 *
 * 전략
 *   HTML       네트워크 우선 (새 버전을 놓치지 않기 위해). 실패하면 캐시.
 *   정적 파일  캐시를 즉시 내주되 뒤에서 새 버전을 받아 갱신한다(stale-while-revalidate).
 *              화면은 빠르게 뜨고, 파일을 고치면 다음 실행에 반영된다.
 *   폰트 조각  92개를 미리 다 받으면 낭비라, 실제로 쓴 것만 캐시에 쌓인다.
 */
const CACHE = 'obba-v6';

// 첫 실행에 반드시 필요한 것만. 나머지는 쓰면서 캐시에 쌓인다.
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/obba.css',
  './assets/favicon.svg',
  './assets/fonts/pretendard/pretendard-dynamic-subset.css',
  './assets/js/data/catalog.js',
  './assets/js/data/flows.js',
  './assets/js/core/store.js',
  './assets/js/core/engine.js',
  './assets/js/ui/icons.js',
  './assets/js/ui/render.js',
  './assets/js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // 하나라도 실패하면 설치 전체가 실패하므로 개별로 담는다
      .then(cache => Promise.allSettled(CORE.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 올리브영 링크 등 외부는 건드리지 않는다

  // HTML 은 네트워크 우선 — 앱을 고쳤을 때 바로 반영되도록
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // 그 외(스타일/스크립트/폰트/아이콘): 캐시를 바로 내주고, 동시에 새 버전을 받아 캐시를 갱신한다.
  // 캐시 우선만 쓰면 파일을 고쳐도 캐시 버전을 올리기 전까지 옛 파일이 계속 나간다.
  event.respondWith(
    caches.match(req).then(hit => {
      const fresh = fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);          // 오프라인이면 캐시로 버틴다

      return hit || fresh;
    })
  );
});
