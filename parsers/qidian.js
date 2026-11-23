// 注意：此函数会被序列化注入页面，内部不能引用外部变量
export function parseQidian() {
  const text = document.body.innerText;
  const result = {
    title: null,
    author: null,
    status: null,
    wordCount: null,
    chapterText: null,
    agoText: null
  };
  // 书名
  const titleEl = document.querySelector('#bookName');
  if (titleEl) result.title = titleEl.textContent.trim();

  // 作者（去掉“作者:”前缀）
  const authorEl = document.querySelector('.book-info .author');
  if (authorEl) {
    result.author = authorEl.textContent.replace(/^作者[:：]\s*/, '').trim();
  }

  // 连载状态
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

  // =====【新版起点：全文文本正则抓取最新章节 + 更新时间】=====
  // 匹配样例文本：最新章节：第123章 xxx · 2026‑11‑22 18:30
  const latestMatch = text.match(/最新章节[:：]\s*(.+?)\s*·\s*(\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{1,2})/);
  if(latestMatch){
    result.chapterText = latestMatch[1].trim();
    // 把绝对时间转为 agoText 格式交给 applyUpdate 处理
    const timeStr = latestMatch[2];
    result.agoText = timeStr;
  }else{
    // 降级：只抓章节名，无时间
    const chapOnly = text.match(/最新章节[:：]\s*([^\n·]+)/);
    if(chapOnly) result.chapterText = chapOnly[1].trim();
  }

  return result;
}
