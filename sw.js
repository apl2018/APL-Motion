/* APL Motion — 최소 서비스워커
   설치 가능(PWA 홈화면 아이콘)을 위해 존재하되, 캐시는 하지 않고 항상 네트워크 우선.
   (GitHub Pages 갱신 시 구버전 캐시로 인한 "옛날 화면" 문제 방지 — 2D/3D에서 겪었던 이슈) */
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  // 네트워크 우선, 실패 시에만 (오프라인) 브라우저 기본 처리에 맡김
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
