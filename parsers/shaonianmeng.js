export function parseShaonianmeng() {
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
  const titleEl = document.querySelector('.bookdetail-name .title');
  if (titleEl) result.title = titleEl.textContent.trim();

  // 作者
  const authorEl = document.querySelector('.penName a');
  if (authorEl) result.author = authorEl.textContent.trim();

  // 连载状态
  const statusEl = document.querySelector('.bookdetail-name .status');
  if (statusEl) {
    const s = statusEl.textContent.trim();
    if (s.includes('连载')) result.status = '连载中';
    else if (s.includes('完结') || s.includes('完本')) result.status = '已完结';
    else result.status = s;
  }

  // 字数
  const fontList = document.querySelector('.font-list');
  if(fontList){
    const txt = fontList.innerText;
    const wordMatch = txt.match(/(\d+(?:\.\d+)?)\s*万字/);
    if (wordMatch) result.wordCount = wordMatch[0];
  }

  // =========【核心：文本扫描找最新章节，不依赖固定class】=========
  const allNodes = Array.from(document.querySelectorAll('div,span,a'));
  for(const el of allNodes){
    const t = el.textContent.trim();
    // 匹配开头是“最新章节”的块
    if(t.startsWith('最新章节')){
      // 去掉“最新章节”前缀，取出章节名
      const after = t.replace(/^最新章节\s*/,'').trim();
      // 再把后面“XX小时前 / XX天前”切掉
      const cleanChapter = after.replace(/\s*\d+\s*(小时前|天前).*$/,'').trim();
      if(cleanChapter){
        result.chapterText = cleanChapter;
      }
      // 提取更新时间文本（小时前/天前）
      const timeMatch = t.match(/(\d+\s*(小时前|天前))/);
      if(timeMatch){
        result.agoText = timeMatch[1];
      }
      break;
    }
  }

  return result;
}
