// 注意：此函数会被序列化注入页面，内部不能引用外部变量
export function parseFanqie() {
  const text = document.body.innerText;
  const result = {
    title: null, author: null, status: null,
    wordCount: null, latestChapter: null, latestUpdateTime: null
  };

  // 书名 h1
  const titleEl = document.querySelector('.info-name h1');
  if (titleEl) result.title = titleEl.textContent.trim();

  // 作者（根据截图：.author-name-text）
  const authorEl = document.querySelector('.author-name-text');
  if (authorEl) {
    result.author = authorEl.textContent.trim();
  }

  // 状态：info-label-yellow 黄色标签（连载中）
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
  const wordMatch = text.match(/(\d+(?:\.\d+)?)\s*万字/);
  if (wordMatch) result.wordCount = wordMatch[0];

  // 最新章节
  const chapterEl = document.querySelector('.info-last .chapter-item-title');
  if (chapterEl) {
    result.latestChapter = chapterEl.textContent.trim();
  }

  // 更新时间，转为和起点一样的 ISO+08:00 格式
  const timeEl = document.querySelector('.info-last-time');
  if (timeEl) {
    const timeText = timeEl.textContent.trim();
    if (timeText) {
      result.latestUpdateTime = timeText.replace(' ', 'T') + '+08:00';
    }
  }

  return result;
}
