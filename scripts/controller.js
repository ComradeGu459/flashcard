/*
 * controller.js
 * 控制器层，连接模型和视图，处理用户交互。
 */

import model from './model.js';
import view from './view.js';
import I18n from './i18n.js';
import { updateCardOnReview } from './spaced.js';
import { toast, uuid } from './utils.js';

class Controller {
  constructor() {
    this.currentCards = [];
    this.currentCategoryId = null;
    this.searchQuery = '';
    this.sortBy = 'due';
    this.currentCardId = null;
  }

  async init() {
    try {
      await I18n.init();
      await model.init();
      // 注册视图回调
      view.init({
        onAddCard: () => this.openAddCard(),
        onOpenManage: () => this.openManage(),
        onToggleTheme: () => this.toggleTheme(),
        onToggleLanguage: () => this.toggleLanguage(),
        onRequestNotification: () => this.requestNotification(),
        onCardClick: (card) => this.openCard(card),
        onRateCard: (rating) => this.rateCurrentCard(rating),
        onSelectCategory: (id) => this.selectCategory(id),
        onSaveCard: (data) => this.saveCard(data),
        onEditCard: (card) => this.openEditCard(card),
        onDeleteCards: (ids) => this.deleteCards(ids),
        onImport: () => this.importCards(),
        onExport: () => this.exportCards(),
        onGenerate: () => this.generateCards(),
        onStats: () => this.showStats(),
        onSearch: (q) => { this.searchQuery = q; this.updateList(); },
        onSort: (s) => { this.sortBy = s; this.updateList(); }
      });
      view.updateTexts();
      // 监听模型变化
      model.subscribe((state) => {
        view.renderCategories(state.categories);
        this.updateList();
        // 更新主题开关
        document.documentElement.setAttribute('data-theme', state.settings.darkMode ? 'dark' : 'light');
        // 更新通知按钮颜色或状态
      });
      // 在订阅之后主动触发一次通知，确保初始渲染
      model.notify();
    } catch (e) {
      console.error('[controller][init]', e);
    }
  }

  /**
   * 根据当前过滤条件刷新卡片列表
   */
  updateList() {
    this.currentCards = model.getCards({ categoryId: this.currentCategoryId, search: this.searchQuery, sortBy: this.sortBy });
    view.renderCardList(this.currentCards);
  }

  /**
   * 选择分类
   */
  selectCategory(id) {
    this.currentCategoryId = id;
    this.updateList();
  }

  /**
   * 打开新增卡片
   */
  openAddCard() {
    view.openEditModal(null);
  }

  /**
   * 打开编辑卡片
   */
  openEditCard(card) {
    view.openEditModal(card);
  }

  /**
   * 保存卡片（新增或编辑）
   */
  async saveCard(data) {
    try {
      if (!data.front || !data.back) {
        toast(I18n.t('toast_operation_fail') + '内容不能为空', 'error');
        return;
      }
      const id = view.editModal.dataset.id;
      if (id) {
        await model.updateCard(id, data);
        toast(I18n.t('toast_update_success'), 'info');
      } else {
        await model.addCard(data);
        toast(I18n.t('toast_add_success'), 'info');
      }
      view.closeEditModal();
    } catch (e) {
      console.error('[controller][saveCard]', e);
      toast(I18n.t('toast_operation_fail') + e.message, 'error');
    }
  }

  /**
   * 打开卡片学习模态
   */
  openCard(card) {
    this.currentCardId = card.id;
    this.currentCard = card;
    view.openCardModal(card);
  }

  /**
   * 评分当前卡片
   */
  async rateCurrentCard(rating) {
    if (!this.currentCardId) return;
    try {
      const card = this.currentCards.find((c) => c.id === this.currentCardId);
      updateCardOnReview(card, rating);
      await model.updateCard(card.id, card);
      // 根据线性浏览跳到下一张
      const currentIndex = this.currentCards.findIndex((c) => c.id === this.currentCardId);
      let nextIndex = currentIndex + 1;
      if (nextIndex >= this.currentCards.length) {
        // 末尾循环
        nextIndex = 0;
        toast('本单元已完成，回到首张卡片', 'info');
      }
      this.currentCardId = this.currentCards[nextIndex]?.id;
      // 关闭当前模态并打开下一张
      view.openCardModal(this.currentCards[nextIndex]);
    } catch (e) {
      console.error('[controller][rateCurrentCard]', e);
      toast(I18n.t('toast_operation_fail') + e.message, 'error');
    }
  }

  /**
   * 删除卡片（支持批量）
   */
  async deleteCards(ids) {
    if (!ids || ids.length === 0) return;
    if (!confirm(I18n.t('toast_delete_confirm'))) return;
    try {
      await model.deleteCards(ids);
      toast(I18n.t('toast_update_success'), 'info');
    } catch (e) {
      console.error('[controller][deleteCards]', e);
      toast(I18n.t('toast_operation_fail') + e.message, 'error');
    }
  }

  /**
   * 打开管理界面并渲染表格
   */
  openManage() {
    view.renderManageTable(this.currentCards);
    view.openManageModal();
  }

  /**
   * 导入卡片
   */
  importCards() {
    // 创建隐藏的文件输入
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          const data = JSON.parse(text);
          const ok = await model.importCards(data);
          if (ok) toast(I18n.t('toast_import_success'), 'info');
          else toast(I18n.t('toast_import_fail'), 'error');
        } catch (err) {
          console.error('[controller][import]', err);
          toast(I18n.t('toast_import_fail'), 'error');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  /**
   * 导出卡片
   */
  exportCards() {
    try {
      const json = model.exportCards();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flashcards-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast(I18n.t('toast_export_success'), 'info');
    } catch (e) {
      console.error('[controller][exportCards]', e);
      toast(I18n.t('toast_operation_fail') + e.message, 'error');
    }
  }

  /**
   * AI 生成卡片 (Stub)
   */
  async generateCards() {
    toast('AI 生成功能尚未实现，请配置 DeepSeek API', 'info');
  }

  /**
   * 统计显示
   */
  showStats() {
    // 简易统计：按照掌握度区分
    const counts = { easy: 0, medium: 0, hard: 0 };
    this.currentCards.forEach((card) => {
      const ef = card.easeFactor || 2.5;
      if (ef > 2.5) counts.easy += 1;
      else if (ef > 2.0) counts.medium += 1;
      else counts.hard += 1;
    });
    // 创建统计 modal 如果不存在
    let statsModal = document.getElementById('stats-modal');
    if (!statsModal) {
      statsModal = document.createElement('div');
      statsModal.id = 'stats-modal';
      statsModal.className = 'modal';
      statsModal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>${I18n.t('stats')}</h2>
            <button class="close-btn" id="stats-close">×</button>
          </div>
          <div class="modal-body">
            <canvas id="stats-canvas" width="400" height="300"></canvas>
          </div>
        </div>
      `;
      document.body.appendChild(statsModal);
      statsModal.querySelector('#stats-close').addEventListener('click', () => {
        statsModal.classList.add('hidden');
      });
    }
    // 绘制饼图
    const canvas = statsModal.querySelector('#stats-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const total = counts.easy + counts.medium + counts.hard || 1;
    const data = [counts.easy, counts.medium, counts.hard];
    const colors = ['#42a5f5', '#ffca28', '#ef5350'];
    let startAngle = 0;
    for (let i = 0; i < data.length; i++) {
      const sliceAngle = (data[i] / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, canvas.height / 2);
      ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2 - 20, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();
      startAngle += sliceAngle;
    }
    // 添加图例
    const labels = [I18n.t('difficulty_easy'), I18n.t('difficulty_medium'), I18n.t('difficulty_hard')];
    labels.forEach((label, index) => {
      ctx.fillStyle = colors[index];
      ctx.fillRect(10, canvas.height - 20 * (labels.length - index), 12, 12);
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${label}: ${data[index]}`, 26, canvas.height - 20 * (labels.length - index) + 10);
    });
    statsModal.classList.remove('hidden');
  }

  /**
   * 切换主题
   */
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const dark = current === 'dark';
    model.updateSettings({ darkMode: !dark });
  }

  /**
   * 切换语言
   */
  async toggleLanguage() {
    const next = I18n.lang === 'zh' ? 'en' : 'zh';
    await I18n.loadLanguage(next);
    view.updateTexts();
    // 重新渲染分类列表和管理表格标题
    this.updateList();
  }

  /**
   * 请求通知权限
   */
  async requestNotification() {
    if (!('Notification' in window)) {
      toast('当前浏览器不支持通知', 'error');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        model.updateSettings({ notifications: true });
        toast('通知已启用', 'info');
      } else {
        model.updateSettings({ notifications: false });
        toast('通知未授权', 'info');
      }
    } catch (e) {
      console.error('[controller][requestNotification]', e);
      toast(I18n.t('toast_operation_fail') + e.message, 'error');
    }
  }
}

const controller = new Controller();
export default controller;