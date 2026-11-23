// 注入页面执行，不能引入外部变量
export function parseXirang() {
  const result = {
    title: null,
    author: null,
    status: null,
    wordCount: null,
    chapterText: null,
    agoText: null
  };

  // 书名：.novel_name
  const titleEl = document.querySelector('.novel_name span');
  if (titleEl) {
    // 去掉后面的 "ID: 112666" 这类后缀
    result.title = titleEl.textContent.trim().replace(/\s*ID[:：]\s*\d+$/, '');
  }

  // 作者：.novel_author span（作者：xxx）
  const authorEl = document.querySelector('.novel_author span');
  if (authorEl) {
    result.author = authorEl.textContent.replace(/^作者[:：]\s*/, '').trim();
  }

  // 连载状态：.novelprosess
  const statusEl = document.querySelector('.novel_type.novelprosess');
  if (statusEl) {
    const s = statusEl.textContent.trim();
    if (s.includes('连载')) result.status = '连载中';
    else if (s.includes('完结')) result.status = '已完结';
    else result.status = s;
  }

  // 最新章节：.newcname
  const chapEl = document.querySelector('.newcname');
  if (chapEl) {
    result.chapterText = chapEl.textContent.trim();
  }

  // 更新时间：.update_time
  const timeEl = document.querySelector('.update_time');
  if (timeEl) {
    result.agoText = timeEl.textContent.trim();
  }

  // 字数：count_list 里面的 199.59万
  const countText = document.querySelector('.count_list')?.textContent || '';
  const wordMatch = countText.match(/(\d+(?:\.\d+)?)\s*万/);
  if (wordMatch) {
    result.wordCount = wordMatch[0] + '字';
  }

  return result;
}
