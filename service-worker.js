/*
 * Service Worker for 考研闪卡大师
 *
 * 该 Service Worker 负责缓存静态资源，提供离线支持。
 */

const CACHE_NAME = 'kaoyan-flashcards-v1';

// 列出所有需要缓存的静态文件。新增文件时，请手动添加到此列表中。
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css',
  './styles/components.css',
  './styles/themes.css',
  './scripts/app.js',
  './scripts/controller.js',
  './scripts/model.js',
  './scripts/view.js',
  './scripts/storage.js',
  './scripts/utils.js',
  './scripts/i18n.js',
  './scripts/spaced.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icons/bell.svg',
  './assets/icons/globe.svg',
  './assets/icons/moon.svg',
  './assets/icons/sun.svg',
  './assets/icons/folder.svg',
  './assets/icons/plus.svg',
  './assets/icons/edit.svg',
  './assets/icons/trash.svg',
  './assets/icons/upload.svg',
  './assets/icons/download.svg',
  './assets/icons/magic.svg',
  './assets/icons/chart-pie.svg'
];

// 安装时缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 拦截请求，缓存优先
self.addEventListener('fetch', (event) => {
  const { request } = event;
  // 对于跨域请求或非 GET 请求，直接通过
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});