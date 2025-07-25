/*
 * app.js
 * 应用入口，注册 Service Worker，初始化控制器。
 */

import controller from './controller.js';

// 注册 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}

// 初始化控制器
controller.init();