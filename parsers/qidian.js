// 注意：此函数会被序列化注入页面，内部不能引用外部变量
export function parseQidian() {
  const text = document.body.innerText;
  const result = {
    title: null, author: null, status: null,
    wordCount: null, latestChapter: null, latestUpdateTime: null
  };

  // 书名
  const titleEl = document.querySelector('#bookName');
  if (titleEl) result.title = titleEl.textContent.trim();

  // 作者（去掉“作者:”前缀）
  const authorEl = document.querySelector('.book-info .author');
  if (authorEl) {
    result.author = authorEl.textContent.replace(/^作者[:：]\s*/, '').trim();
  }

  // 【关键修改】连载状态：精确定位到 .book-attribute 的第一个 span
  const statusEl = document.querySelector('.book-attribute span:first-child');
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
  const wordMatch = text.match(/(\d+(?:\.\d+)?)\s*万字/);
  if (wordMatch) result.wordCount = wordMatch[0];

  // 最新章节（去掉“最新章节：”前缀）
  const chapterEl = document.querySelector('.book-info .book-latest-chapter');
  if (chapterEl) {
    result.latestChapter = chapterEl.textContent.replace(/^最新章节[:：]\s*/, '').trim();
  }

  // 更新时间（去掉“更新时间:”前缀，转为 ISO 格式）
  const timeEl = document.querySelector('.book-info .update-time');
  if (timeEl) {
    const timeText = timeEl.textContent.replace(/^更新时间[:：]\s*/, '').trim();
    if (timeText) {
      result.latestUpdateTime = timeText.replace(' ', 'T') + '+08:00';
    }
  }

  return result;
}