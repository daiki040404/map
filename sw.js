/* 筋トレログ オフライン用サービスワーカー
   kintore.html と同じフォルダ（/map/）に置くこと */
const CACHE = 'kintore-v1';
const SHELL = ['./kintore.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                  // 保存・同期などの書き込みは触らない
  const url = new URL(req.url);
  // Firebase（データ同期・ログイン）の通信はSWを通さない（同期を壊さないため）
  if (/firestore|identitytoolkit|securetoken/i.test(url.host)) return;

  // それ以外のGETはキャッシュ優先＋裏で更新（stale-while-revalidate）
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
