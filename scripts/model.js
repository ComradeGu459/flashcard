/*
 * model.js
 * 数据模型层，负责闪卡数据、分类、设置的存储和操作。
 */

import { Storage } from './storage.js';
import { uuid } from './utils.js';

const CARDS_KEY = 'flashcards_data';
const CATEGORIES_KEY = 'flashcards_categories';
const SETTINGS_KEY = 'flashcards_settings';

class Model {
  constructor() {
    this.cards = [];
    this.categories = [];
    this.settings = {
      darkMode: false,
      notifications: false
    };
    this.watchers = new Set();
  }

  // 初始化：从本地存储加载数据
  async init() {
    const [cards, categories, settings] = await Promise.all([
      Storage.get(CARDS_KEY, []),
      Storage.get(CATEGORIES_KEY, []),
      Storage.get(SETTINGS_KEY, null)
    ]);
    this.cards = Array.isArray(cards) ? cards : [];
    this.categories = Array.isArray(categories) ? categories : [];
    if (settings) {
      this.settings = Object.assign(this.settings, settings);
    }
    // 如果没有分类，初始化默认科目
    if (this.categories.length === 0) {
      this.categories = [
        { id: uuid(), name: '政治' },
        { id: uuid(), name: '英语' },
        { id: uuid(), name: '数学' }
      ];
      await Storage.set(CATEGORIES_KEY, this.categories);
    }
    this.notify();
  }

  // 订阅数据变化通知
  subscribe(handler) {
    this.watchers.add(handler);
  }
  unsubscribe(handler) {
    this.watchers.delete(handler);
  }
  notify() {
    // 批量通知：异步执行以避免阻塞
    this.watchers.forEach((cb) => {
      try {
        cb({ cards: this.cards, categories: this.categories, settings: this.settings });
      } catch (e) {
        console.error('[model][notify]', e);
      }
    });
  }

  // 获取卡片，支持过滤
  getCards({ categoryId = null, search = '', sortBy = 'due' } = {}) {
    let result = this.cards.slice();
    if (categoryId) {
      const category = this.categories.find((c) => c.id === categoryId);
      if (category) {
        result = result.filter((card) => card.category === category.name);
      }
    }
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((card) =>
        card.front.toLowerCase().includes(lower) || card.back.toLowerCase().includes(lower)
      );
    }
    // 排序
    switch (sortBy) {
      case 'ease':
        result.sort((a, b) => (b.easeFactor || 0) - (a.easeFactor || 0));
        break;
      case 'front':
        result.sort((a, b) => a.front.localeCompare(b.front));
        break;
      case 'error':
        result.sort((a, b) => (b.errorCount || 0) - (a.errorCount || 0));
        break;
      case 'due':
      default:
        result.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
        break;
    }
    return result;
  }

  async addCard(data) {
    const newCard = {
      id: uuid(),
      front: data.front,
      back: data.back,
      category: data.category || '',
      chapter: data.chapter || '',
      tags: data.tags || '',
      easeFactor: 2.5,
      interval: 0,
      dueDate: new Date().toISOString(),
      reviewCount: 0,
      errorCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.cards.push(newCard);
    await Storage.set(CARDS_KEY, this.cards);
    this.notify();
    return newCard;
  }

  async updateCard(id, updates) {
    const idx = this.cards.findIndex((c) => c.id === id);
    if (idx !== -1) {
      const card = this.cards[idx];
      Object.assign(card, updates, { updatedAt: new Date().toISOString() });
      this.cards[idx] = card;
      await Storage.set(CARDS_KEY, this.cards);
      this.notify();
      return card;
    }
    return null;
  }

  async deleteCards(ids) {
    this.cards = this.cards.filter((c) => !ids.includes(c.id));
    await Storage.set(CARDS_KEY, this.cards);
    this.notify();
  }

  async importCards(cardsArray) {
    if (!Array.isArray(cardsArray)) return false;
    for (const data of cardsArray) {
      // 复制 id？若传入的数据已有 id，为避免冲突可生成新 id
      const card = Object.assign({}, data);
      card.id = uuid();
      card.createdAt = new Date().toISOString();
      card.updatedAt = new Date().toISOString();
      // 默认值处理
      if (!card.easeFactor) card.easeFactor = 2.5;
      if (!card.interval) card.interval = 0;
      if (!card.dueDate) card.dueDate = new Date().toISOString();
      if (!card.errorCount) card.errorCount = 0;
      if (!card.reviewCount) card.reviewCount = 0;
      this.cards.push(card);
    }
    await Storage.set(CARDS_KEY, this.cards);
    this.notify();
    return true;
  }

  exportCards() {
    return JSON.stringify(this.cards, null, 2);
  }

  // 分类管理
  async addCategory(name) {
    const newCat = { id: uuid(), name };
    this.categories.push(newCat);
    await Storage.set(CATEGORIES_KEY, this.categories);
    this.notify();
    return newCat;
  }
  async deleteCategory(id) {
    const cat = this.categories.find((c) => c.id === id);
    if (!cat) return;
    // 删除分类时将卡片的分类置空
    this.cards.forEach((card) => {
      if (card.category === cat.name) {
        card.category = '';
      }
    });
    this.categories = this.categories.filter((c) => c.id !== id);
    await Promise.all([
      Storage.set(CATEGORIES_KEY, this.categories),
      Storage.set(CARDS_KEY, this.cards)
    ]);
    this.notify();
  }
  async renameCategory(id, newName) {
    const cat = this.categories.find((c) => c.id === id);
    if (!cat) return;
    const oldName = cat.name;
    cat.name = newName;
    // 更新卡片中的分类名称
    this.cards.forEach((card) => {
      if (card.category === oldName) {
        card.category = newName;
      }
    });
    await Promise.all([
      Storage.set(CATEGORIES_KEY, this.categories),
      Storage.set(CARDS_KEY, this.cards)
    ]);
    this.notify();
  }

  async updateSettings(newSettings) {
    this.settings = Object.assign({}, this.settings, newSettings);
    await Storage.set(SETTINGS_KEY, this.settings);
    this.notify();
  }
}

const modelInstance = new Model();
export default modelInstance;