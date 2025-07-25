/*
 * storage.js
 * 本地存储封装，返回 Promise 接口以便异步处理
 */

export const Storage = {
  async get(key, defaultValue = null) {
    return new Promise((resolve) => {
      try {
        const json = localStorage.getItem(key);
        if (json === null || json === undefined) {
          resolve(defaultValue);
        } else {
          resolve(JSON.parse(json));
        }
      } catch (e) {
        console.error('[storage][get]', e);
        resolve(defaultValue);
      }
    });
  },
  async set(key, value) {
    return new Promise((resolve, reject) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      } catch (e) {
        console.error('[storage][set]', e);
        reject(e);
      }
    });
  },
  async remove(key) {
    return new Promise((resolve) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('[storage][remove]', e);
      } finally {
        resolve();
      }
    });
  }
};