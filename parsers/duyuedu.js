export function parseDuyuedu() {
  const result = {
    title: null,
    author: null,
    status: null,
    wordCount: null,
    chapterText: null,
    agoText: null
  };
  result._htmlSnapshot = document.body.innerHTML.slice(0, 4000);

  // 书名
  const titleEl = document.querySelector('.book-title span');
  if (titleEl) result.title = titleEl.textContent.trim();

  // 连载状态标签
  const statusEl = document.querySelector('.tag-lianzai');
  result.status = statusEl ? '连载中' : '已完结';

  // ====== 作者：根据你给的DOM，取 username text-primary ======
  const authorEl = document.querySelector('.user-info .username.text-primary');
  if (authorEl) {
    result.author = authorEl.textContent.trim();
  }

  // 字数
  const infoNumBox = document.querySelector('.book-info-numbers');
  if (infoNumBox) {
    const txt = infoNumBox.innerText;
    const wordMatch = txt.match(/总字数[:：]\s*(\d+(?:\.\d+)?)\s*万/);
    if (wordMatch) {
      result.wordCount = wordMatch[1] + ' 万字';
    }
  }

  // 取目录最后一章
  const chapterItems = document.querySelectorAll('#chapter_list .chapter_item a');
  if (chapterItems.length > 0) {
    const lastA = chapterItems[chapterItems.length - 1];
    result.chapterText = lastA.textContent.trim();
  }

  // 标记：页面无更新时间，进入本地比对模式
  result.agoText = null;

  return result;
}
