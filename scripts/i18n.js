/*
 * i18n.js
 * 国际化处理：加载语言包，提供翻译函数。
 */

import { Storage } from './storage.js';

const DEFAULT_LANG = 'zh';
const LANG_KEY = 'app_language';

// 内置语言资源，避免通过 fetch 在 file 协议下加载失败
const TRANSLATIONS = {
  zh: {
    app_title: "考研闪卡大师",
    notify: "提醒",
    language: "语言",
    theme: "主题",
    manage: "题库管理",
    add_card: "添加卡片",
    no_cards: "暂无卡片，点击左侧“添加卡片”开始学习！",
    card_modal_title: "闪卡",
    difficulty_hard: "困难",
    difficulty_medium: "模糊",
    difficulty_easy: "清晰",
    manage_title: "题库管理",
    import: "导入",
    export: "导出",
    generate: "AI生成",
    stats: "统计",
    search_placeholder: "搜索卡片...",
    sort_due: "按复习时间",
    sort_ease: "按掌握度",
    sort_front: "按题干",
    sort_error: "按错题数",
    add_new: "新增卡片",
    edit_title_new: "新增卡片",
    edit_title_edit: "编辑卡片",
    front_label: "正面:",
    back_label: "背面:",
    category_label: "科目:",
    chapter_label: "章节:",
    tags_label: "标签 (逗号分隔):",
    save: "保存",
    cancel: "取消",
    toast_import_success: "导入成功。",
    toast_import_fail: "导入失败：无效数据。",
    toast_export_success: "导出成功。",
    toast_delete_confirm: "确定要删除吗？",
    toast_update_success: "更新成功。",
    toast_add_success: "添加成功。",
    toast_operation_fail: "操作失败：",
    mode_day: "日间模式",
    mode_night: "夜间模式",
    prompt_notification: "启用通知以获取复习提醒",
    ok: "确定",
    cancel_button: "取消"
  },
  en: {
    app_title: "Flashcard Master",
    notify: "Notify",
    language: "Language",
    theme: "Theme",
    manage: "Manage",
    add_card: "Add Card",
    no_cards: "No cards available, click 'Add Card' on the left to start!",
    card_modal_title: "Flashcard",
    difficulty_hard: "Hard",
    difficulty_medium: "Medium",
    difficulty_easy: "Easy",
    manage_title: "Card Management",
    import: "Import",
    export: "Export",
    generate: "AI Generate",
    stats: "Statistics",
    search_placeholder: "Search cards...",
    sort_due: "By Review Time",
    sort_ease: "By Ease",
    sort_front: "By Front Text",
    sort_error: "By Error Count",
    add_new: "Add New Card",
    edit_title_new: "Add New Card",
    edit_title_edit: "Edit Card",
    front_label: "Front:",
    back_label: "Back:",
    category_label: "Subject:",
    chapter_label: "Chapter:",
    tags_label: "Tags (comma separated):",
    save: "Save",
    cancel: "Cancel",
    toast_import_success: "Import successful.",
    toast_import_fail: "Import failed: invalid data.",
    toast_export_success: "Export successful.",
    toast_delete_confirm: "Are you sure to delete?",
    toast_update_success: "Update successful.",
    toast_add_success: "Add successful.",
    toast_operation_fail: "Operation failed: ",
    mode_day: "Day Mode",
    mode_night: "Night Mode",
    prompt_notification: "Enable notifications to get review reminders",
    ok: "OK",
    cancel_button: "Cancel"
  }
};

const I18n = {
  lang: DEFAULT_LANG,
  messages: TRANSLATIONS[DEFAULT_LANG],
  async init() {
    const saved = await Storage.get(LANG_KEY, null);
    this.lang = saved || DEFAULT_LANG;
    this.messages = TRANSLATIONS[this.lang] || TRANSLATIONS[DEFAULT_LANG];
  },
  async loadLanguage(lang) {
    this.lang = lang;
    this.messages = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
    await Storage.set(LANG_KEY, lang);
  },
  t(key) {
    return this.messages[key] || key;
  }
};

export default I18n;