// 注意：此函数会被序列化注入页面，内部不能引用外部变量
export function parseFanqie() {
  const result = {
    title: null,
    author: null,
    status: null,
    wordCount: null,
    chapterText: null,
    agoText: null
  };

  // 书名
  const titleEl = document.querySelector('.info-name h1');
  if (titleEl) result.title = titleEl.textContent.trim();

  // 作者
  const authorEl = document.querySelector('.author-name-text');
  if (authorEl) {
    result.author = authorEl.textContent.trim();
  }

  // 状态标签
  const statusEl = document.querySelector('.info-label-yellow');
  if (statusEl) {
    const statusText = statusEl.textContent.trim();
    if (statusText.includes('连载')) {
      result.status = '连载中';
    } else if (statusText.includes('完结') || statusText.includes('完本')) {
      result.status = '已完结';
    } else {
      result.status = statusText;
    }
  }

  // 字数
  const wordEl = document.querySelector('.info-count-word .detail');
  if (wordEl) {
    result.wordCount = wordEl.textContent.trim() + '万字';
  }

  // ========= 重点：从截图里的选择器拿最新章节、时间 =========
  const chapEl = document.querySelector('.info-last-title');
  if (chapEl) {
    let chapRaw = chapEl.textContent.trim();
    // 去掉开头的“最近更新：”
    chapRaw = chapRaw.replace(/^最近更新[:：]\s*/, '');
    result.chapterText = chapRaw;
  }
  const timeEl = document.querySelector('.info-last-time');
  if (timeEl) {
    result.agoText = timeEl.textContent.trim();
  }

  return result;
}
