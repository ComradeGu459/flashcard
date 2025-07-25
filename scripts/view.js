/*
 * view.js
 * 负责页面渲染和虚拟列表、模态框控制。仅处理 DOM，并通过回调将事件传递给控制器。
 */

import { debounce, throttle, toast, KEY } from './utils.js';
import I18n from './i18n.js';

class View {
  constructor() {
    // DOM 引用
    this.header = document.getElementById('app-header');
    this.categoryListEl = document.getElementById('category-list');
    this.cardListEl = document.getElementById('card-list');
    this.emptyStateEl = document.getElementById('empty-state');

    // 模态框
    this.cardModal = document.getElementById('card-modal');
    this.modalFront = document.getElementById('modal-front');
    this.modalBack = document.getElementById('modal-back');
    this.cardFlipWrapper = document.getElementById('card-flip');
    this.btnHard = document.getElementById('btn-hard');
    this.btnMedium = document.getElementById('btn-medium');
    this.btnEasy = document.getElementById('btn-easy');
    this.btnModalClose = document.getElementById('modal-close');

    this.manageModal = document.getElementById('manage-modal');
    this.manageCloseBtn = document.getElementById('manage-close');
    this.manageTableEl = document.getElementById('manage-table');
    this.manageSearchInput = document.getElementById('search-input');
    this.manageSortSelect = document.getElementById('sort-select');
    this.manageAddNew = document.getElementById('btn-add-new');
    this.manageImportBtn = document.getElementById('btn-import');
    this.manageExportBtn = document.getElementById('btn-export');
    this.manageGenerateBtn = document.getElementById('btn-generate');
    this.manageStatsBtn = document.getElementById('btn-stats');

    this.editModal = document.getElementById('edit-modal');
    this.editCloseBtn = document.getElementById('edit-close');
    this.editTitleEl = document.getElementById('edit-title');
    this.editForm = document.getElementById('edit-form');
    this.editFront = document.getElementById('edit-front');
    this.editBack = document.getElementById('edit-back');
    this.editCategory = document.getElementById('edit-category');
    this.editChapter = document.getElementById('edit-chapter');
    this.editTags = document.getElementById('edit-tags');
    this.editSaveBtn = document.getElementById('edit-save');
    this.categoryDatalist = document.getElementById('category-datalist');

    // 操作按钮
    this.addCardBtn = document.getElementById('btn-add-card');
    this.manageBtn = document.getElementById('btn-manage');
    this.themeBtn = document.getElementById('btn-theme');
    this.langBtn = document.getElementById('btn-lang');
    this.notifyBtn = document.getElementById('btn-notify');

    // 虚拟列表状态
    this.cards = [];
    this.itemHeight = 80; // 每个卡片元素的预估高度（px）
    this.buffer = 5; // 前后缓冲区数量
    this.listInner = null;
    this.renderedStart = -1;
    this.renderedEnd = -1;
    this.onCardClick = null;

    // 当前高亮的分类 id
    this.activeCategoryId = null;
  }

  /**
   * 初始化视图，绑定基本事件
   * @param {Object} callbacks - 控制器传入的回调函数
   */
  init(callbacks) {
    // 保存回调
    this.callbacks = callbacks;

    // 绑定按钮
    this.addCardBtn.addEventListener('click', () => callbacks.onAddCard());
    this.manageBtn.addEventListener('click', () => callbacks.onOpenManage());
    this.themeBtn.addEventListener('click', () => callbacks.onToggleTheme());
    this.langBtn.addEventListener('click', () => callbacks.onToggleLanguage());
    this.notifyBtn.addEventListener('click', () => callbacks.onRequestNotification());

    // 模态框关闭
    this.btnModalClose.addEventListener('click', () => this.closeCardModal());
    this.manageCloseBtn.addEventListener('click', () => this.closeManageModal());
    this.editCloseBtn.addEventListener('click', () => this.closeEditModal());

    // 标记按钮
    this.btnHard.addEventListener('click', () => callbacks.onRateCard('hard'));
    this.btnMedium.addEventListener('click', () => callbacks.onRateCard('medium'));
    this.btnEasy.addEventListener('click', () => callbacks.onRateCard('easy'));

    // 卡片翻转
    this.cardFlipWrapper.addEventListener('click', () => this.toggleCardFlip());

    // 键盘事件：翻转和评分
    document.addEventListener('keydown', (e) => {
      if (this.cardModal.classList.contains('hidden')) return;
      if (e.key === KEY.LEFT) {
        // flip back to front
        this.cardFlipWrapper.classList.toggle('flip');
      } else if (e.key === KEY.RIGHT) {
        // flip to back
        this.cardFlipWrapper.classList.toggle('flip');
      } else if (e.key === KEY.ENTER) {
        callbacks.onRateCard('easy');
      }
    });

    // 编辑保存
    this.editSaveBtn.addEventListener('click', () => {
      const data = {
        front: this.editFront.value.trim(),
        back: this.editBack.value.trim(),
        category: this.editCategory.value.trim(),
        chapter: this.editChapter.value.trim(),
        tags: this.editTags.value.trim()
      };
      callbacks.onSaveCard(data);
    });

    // 管理模态按钮
    this.manageAddNew.addEventListener('click', () => callbacks.onAddCard());
    this.manageImportBtn.addEventListener('click', () => callbacks.onImport());
    this.manageExportBtn.addEventListener('click', () => callbacks.onExport());
    this.manageGenerateBtn.addEventListener('click', () => callbacks.onGenerate());
    this.manageStatsBtn.addEventListener('click', () => callbacks.onStats());
    this.manageSearchInput.addEventListener('input', debounce((e) => {
      callbacks.onSearch(e.target.value);
    }, 300));
    this.manageSortSelect.addEventListener('change', (e) => {
      callbacks.onSort(e.target.value);
    });

    // 虚拟滚动
    this.cardListEl.addEventListener('scroll', throttle(() => this.renderVisible(), 50));
  }

  /**
   * 渲染分类列表
   */
  renderCategories(categories) {
    this.categoryListEl.innerHTML = '';
    const fragment = document.createDocumentFragment();
    categories.forEach((cat) => {
      const li = document.createElement('li');
      li.textContent = cat.name || '未分类';
      li.dataset.id = cat.id;
      if (this.activeCategoryId === cat.id) {
        li.classList.add('active');
      }
      li.addEventListener('click', () => {
        this.activeCategoryId = cat.id;
        this.callbacks.onSelectCategory(cat.id);
      });
      fragment.appendChild(li);
    });
    this.categoryListEl.appendChild(fragment);
    // 更新 datalist 用于编辑
    this.categoryDatalist.innerHTML = '';
    categories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.name;
      this.categoryDatalist.appendChild(option);
    });
  }

  /**
   * 渲染卡片列表，启用虚拟列表
   */
  renderCardList(cards) {
    this.cards = cards || [];
    // 显示或隐藏空状态
    if (this.cards.length === 0) {
      this.emptyStateEl.classList.remove('hidden');
    } else {
      this.emptyStateEl.classList.add('hidden');
    }
    // 如果 listInner 未初始化，则创建
    if (!this.listInner) {
      this.listInner = document.createElement('div');
      this.listInner.style.position = 'relative';
      this.cardListEl.innerHTML = '';
      this.cardListEl.appendChild(this.listInner);
    }
    // 更新内部高度
    this.listInner.style.height = `${this.cards.length * this.itemHeight}px`;
    // 重置渲染索引
    this.renderedStart = -1;
    this.renderedEnd = -1;
    // 初次渲染
    this.renderVisible();
  }

  /**
   * 根据滚动位置渲染可见区域的卡片
   */
  renderVisible() {
    const scrollTop = this.cardListEl.scrollTop;
    const height = this.cardListEl.clientHeight;
    const start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.buffer);
    const end = Math.min(this.cards.length - 1, Math.ceil((scrollTop + height) / this.itemHeight) + this.buffer);
    if (start === this.renderedStart && end === this.renderedEnd) {
      return; // 无需重新渲染
    }
    this.renderedStart = start;
    this.renderedEnd = end;
    // 使用 DocumentFragment 批量更新
    const fragment = document.createDocumentFragment();
    for (let i = start; i <= end; i++) {
      const card = this.cards[i];
      const cardEl = document.createElement('div');
      cardEl.className = 'card-item';
      cardEl.style.position = 'absolute';
      cardEl.style.top = `${i * this.itemHeight}px`;
      cardEl.style.left = '0';
      cardEl.style.right = '0';
      cardEl.dataset.id = card.id;
      // 前端预览
      const preview = document.createElement('div');
      preview.className = 'card-front-preview';
      preview.textContent = card.front;
      cardEl.appendChild(preview);
      // meta
      const meta = document.createElement('div');
      meta.className = 'card-meta';
      const due = card.dueDate ? new Date(card.dueDate).toLocaleDateString() : '';
      meta.textContent = due;
      cardEl.appendChild(meta);
      cardEl.addEventListener('click', () => {
        if (this.callbacks.onCardClick) this.callbacks.onCardClick(card);
      });
      fragment.appendChild(cardEl);
    }
    // 清空并插入
    this.listInner.innerHTML = '';
    this.listInner.appendChild(fragment);
  }

  /**
   * 打开卡片模态框并填充内容
   */
  openCardModal(card) {
    if (!card) return;
    // 填充正反面
    this.modalFront.textContent = card.front;
    this.modalBack.textContent = card.back;
    this.cardFlipWrapper.classList.remove('flip');
    this.cardModal.classList.remove('hidden');
  }

  /**
   * 关闭卡片模态框
   */
  closeCardModal() {
    this.cardModal.classList.add('hidden');
  }

  /**
   * 翻转卡片
   */
  toggleCardFlip() {
    this.cardFlipWrapper.classList.toggle('flip');
  }

  /**
   * 打开管理模态
   */
  openManageModal() {
    this.manageModal.classList.remove('hidden');
  }
  closeManageModal() {
    this.manageModal.classList.add('hidden');
  }

  /**
   * 渲染管理表格
   */
  renderManageTable(cards) {
    // 构建简单表格
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    ['选中', '题干', '掌握度', '复习时间', '错误数', '操作'].forEach((text) => {
      const th = document.createElement('th');
      th.textContent = text;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    cards.forEach((card) => {
      const tr = document.createElement('tr');
      // checkbox
      const tdCheck = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.id = card.id;
      tdCheck.appendChild(checkbox);
      tr.appendChild(tdCheck);
      // front
      const tdFront = document.createElement('td');
      tdFront.textContent = card.front;
      tr.appendChild(tdFront);
      // ease
      const tdEase = document.createElement('td');
      tdEase.textContent = card.easeFactor?.toFixed(2);
      tr.appendChild(tdEase);
      // due
      const tdDue = document.createElement('td');
      tdDue.textContent = card.dueDate ? new Date(card.dueDate).toLocaleDateString() : '';
      tr.appendChild(tdDue);
      // error
      const tdErr = document.createElement('td');
      tdErr.textContent = card.errorCount || 0;
      tr.appendChild(tdErr);
      // operations
      const tdOps = document.createElement('td');
      // edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      const editImg = document.createElement('img');
      editImg.src = 'assets/icons/edit.svg';
      editImg.alt = 'edit';
      editBtn.appendChild(editImg);
      editBtn.addEventListener('click', () => {
        this.callbacks.onEditCard(card);
      });
      tdOps.appendChild(editBtn);
      // delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      const delImg = document.createElement('img');
      delImg.src = 'assets/icons/trash.svg';
      delImg.alt = 'delete';
      delBtn.appendChild(delImg);
      delBtn.addEventListener('click', () => {
        this.callbacks.onDeleteCards([card.id]);
      });
      tdOps.appendChild(delBtn);
      tr.appendChild(tdOps);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    this.manageTableEl.innerHTML = '';
    this.manageTableEl.appendChild(table);
  }

  /**
   * 打开编辑模态：mode 为 'add' 或 'edit'
   */
  openEditModal(card = null) {
    if (card) {
      this.editTitleEl.textContent = I18n.t('edit_title_edit');
      this.editFront.value = card.front;
      this.editBack.value = card.back;
      this.editCategory.value = card.category || '';
      this.editChapter.value = card.chapter || '';
      this.editTags.value = card.tags || '';
      this.editModal.dataset.id = card.id;
    } else {
      this.editTitleEl.textContent = I18n.t('edit_title_new');
      this.editFront.value = '';
      this.editBack.value = '';
      this.editCategory.value = '';
      this.editChapter.value = '';
      this.editTags.value = '';
      delete this.editModal.dataset.id;
    }
    this.editModal.classList.remove('hidden');
  }
  closeEditModal() {
    this.editModal.classList.add('hidden');
  }

  /**
   * 更新语言：重新渲染静态文本
   */
  updateTexts() {
    document.title = I18n.t('app_title');
    document.querySelector('.app-title').textContent = I18n.t('app_title');
    this.addCardBtn.innerHTML = `<img src="assets/icons/plus.svg" alt="plus" /> ${I18n.t('add_card')}`;
    this.manageBtn.title = I18n.t('manage');
    this.themeBtn.title = I18n.t('theme');
    this.langBtn.title = I18n.t('language');
    this.notifyBtn.title = I18n.t('notify');
    // 更新管理模态静态文本
    // buttons
    this.manageImportBtn.innerHTML = `<img src="assets/icons/upload.svg" alt="upload" /> ${I18n.t('import')}`;
    this.manageExportBtn.innerHTML = `<img src="assets/icons/download.svg" alt="download" /> ${I18n.t('export')}`;
    this.manageGenerateBtn.innerHTML = `<img src="assets/icons/magic.svg" alt="magic" /> ${I18n.t('generate')}`;
    this.manageStatsBtn.innerHTML = `<img src="assets/icons/chart-pie.svg" alt="chart" /> ${I18n.t('stats')}`;
    this.manageAddNew.textContent = I18n.t('add_new');
    this.manageSearchInput.placeholder = I18n.t('search_placeholder');
    // sort select options
    this.manageSortSelect.querySelectorAll('option')[0].textContent = I18n.t('sort_due');
    this.manageSortSelect.querySelectorAll('option')[1].textContent = I18n.t('sort_ease');
    this.manageSortSelect.querySelectorAll('option')[2].textContent = I18n.t('sort_front');
    this.manageSortSelect.querySelectorAll('option')[3].textContent = I18n.t('sort_error');
    // modal titles/buttons
    this.btnHard.textContent = I18n.t('difficulty_hard');
    this.btnMedium.textContent = I18n.t('difficulty_medium');
    this.btnEasy.textContent = I18n.t('difficulty_easy');
    this.editSaveBtn.textContent = I18n.t('save');
    // labels for edit form
    this.editForm.querySelector('label[for="edit-front"]').textContent = I18n.t('front_label');
    this.editForm.querySelector('label[for="edit-back"]').textContent = I18n.t('back_label');
    this.editForm.querySelector('label[for="edit-category"]').textContent = I18n.t('category_label');
    this.editForm.querySelector('label[for="edit-chapter"]').textContent = I18n.t('chapter_label');
    this.editForm.querySelector('label[for="edit-tags"]').textContent = I18n.t('tags_label');
    this.emptyStateEl.querySelector('p').textContent = I18n.t('no_cards');
  }
}

const viewInstance = new View();
export default viewInstance;