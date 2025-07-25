/*
 * utils.js
 * 工具函数集合：节流、防抖、Toast 提示等。
 */

export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function throttle(fn, delay = 200) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

// Toast 提示组件
export function toast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => {
    div.remove();
  }, duration);
}

// 解析 JSON，带错误处理
export function parseJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    return data;
  } catch (e) {
    console.error('[utils][parseJSON]', e);
    return null;
  }
}

// 格式化日期为 YYYY-MM-DD
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

// 生成唯一 ID
export function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 键盘快捷键映射
export const KEY = {
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  ENTER: 'Enter'
};

// 异步等待（用于分批渲染）
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}