// 오프라인 실행용 서비스 워커.
// 저장해 둔 파일로 바로 열고, 인터넷이 되면 뒤에서 새 버전을 받아 다음 실행 때 반영한다.
const CACHE = 'kmsd-v35';
importScripts('js/bg-data.js', 'js/words.js'); // 배경 그림 목록 (BG_SIZES), 단어 그림 목록 (Words)
const FILES = [
  './',
  'index.html',
  'css/style.css',
  'js/core.js',
  'js/maze.js',
  'js/scene.js',
  'js/emoji-data.js',
  'js/emoji-render.js',
  'js/bg-data.js',
  'js/bg-images.js',
  'js/draw.js',
  'js/store.js',
  'js/audio.js',
  'js/ui-maze.js',
  'js/ui-spot.js',
  'js/chop.js',
  'js/ui-chop.js',
  'js/coconut.js',
  'js/ui-coco.js',
  'js/tictactoe.js',
  'js/ui-ttt.js',
  'js/words.js',
  'js/ui-words.js',
  'js/numbers.js',
  'js/ui-bus.js',
  'js/ui-monster.js',
  'js/ui-ten.js',
  'js/rps.js',
  'js/ui-rps.js',
  'js/garden.js',
  'js/ui-grow.js',
  'assets/rps/rock.svg',
  'assets/rps/paper.svg',
  'assets/rps/scissors.svg',
  'js/faces.js',
  'js/memory.js',
  'js/ui-memo.js',
  'js/hidden.js',
  'js/ui-hidden.js',
  'js/pattern.js',
  'js/ui-pattern.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
].concat(Object.keys(self.BG_SIZES).map((n) => 'assets/kenney/' + n + '.png'))
  .concat(self.Words.WORDS.map((x) => 'assets/words/' + x.file + '.svg'));

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
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
