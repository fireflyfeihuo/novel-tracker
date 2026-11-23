// 注意：此函数会被序列化注入页面，内部不能引用外部变量
export function parseCiweimao() {
  const text = document.body.innerText;
const result = {
    title: null, author: null, status: null,
    wordCount: null, chapterText: null, agoText: null
};


  // 书名 h1.title
  const titleEl = document.querySelector('.book-info h1.title');
  if (titleEl) result.title = titleEl.textContent.trim();

  // 作者：h1.title 里面的 a 标签
  const authorEl = document.querySelector('.book-info h1.title a');
  if (authorEl) {
    result.author = authorEl.textContent.trim();
  }

  // 状态：.update-state
  const statusEl = document.querySelector('.update-state');
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

  // 总字数：book-grade里的总数字，拿到数字后拼接“万字”
  const wordRawEl = document.querySelector('.book-grade');
  if (wordRawEl) {
    const wordMatch = wordRawEl.textContent.match(/总字数[:：]\s*(\d+)/);
    if (wordMatch) {
      const num = Number(wordMatch[1]);
      result.wordCount = (num / 10000).toFixed(1) + '万字';
    }
  }

  // 最新章节 + 更新时间
  const timeEl = document.querySelector('.update-time');
  if (timeEl) {
    const timeText = timeEl.textContent.trim();
    // 匹配章节名 和 时间
    const chMatch = timeText.match(/^(.*?)\s*\[\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s*\]/);
    if (chMatch) {
result.chapterText = chMatch[1].trim();
const rawTime = chMatch[2];
result.agoText = rawTime;

    }
  }

  return result;
}
