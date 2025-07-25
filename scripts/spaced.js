/*
 * spaced.js
 * 间隔重复算法实现，采用 SM2 算法。
 */

export function updateCardOnReview(card, rating) {
  // rating: 'hard', 'medium', 'easy'
  const now = Date.now();
  // 将字符串映射为数值评分（0-5）
  let quality;
  switch (rating) {
    case 'easy':
      quality = 5;
      break;
    case 'medium':
      quality = 4;
      break;
    case 'hard':
    default:
      quality = 2; // 评分低于 3 均视为记错
      break;
  }
  if (!card.interval) card.interval = 0;
  if (!card.easeFactor) card.easeFactor = 2.5;
  if (!card.reviewCount) card.reviewCount = 0;
  if (!card.errorCount) card.errorCount = 0;

  // 更新错误计数
  if (quality < 3) {
    card.errorCount += 1;
  }

  if (quality < 3) {
    card.interval = 1;
  } else if (card.interval === 0) {
    card.interval = 1;
  } else if (card.interval === 1) {
    card.interval = 6;
  } else {
    card.interval = Math.round(card.interval * card.easeFactor);
  }

  // 更新 Ease Factor
  card.easeFactor = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (card.easeFactor < 1.3) card.easeFactor = 1.3;

  // 计算下一次复习日期
  card.dueDate = new Date(now + card.interval * 24 * 60 * 60 * 1000).toISOString();

  card.reviewCount += 1;
  card.updatedAt = new Date().toISOString();
  return card;
}