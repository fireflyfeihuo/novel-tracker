// 注意！这个函数不在网页中执行！运行在service‑worker，接收页面抓取的innerText文本
export function parseXirangFromText(pageText) {
  const result = {
    title: null,
    author: null,
    status: null,
    wordCount: null,
    chapterText: null,
    agoText: null
  };

  // 书名
  const titleMatch = pageText.match(/(.+?)\s+ID:\s*\d+/);
  if(titleMatch){
    result.title = titleMatch[1].trim();
  }
  // 作者
  const authorMatch = pageText.match(/作者[:：]\s*([^\n\r【\]]+)/);
  if(authorMatch){
    result.author = authorMatch[1].trim();
  }
  // 状态
  if(pageText.includes('连载中')) result.status = '连载中';
  else if(pageText.includes('完结')) result.status = '已完结';

  // 最新章节+时间
  const latestReg = /最新章节\s+(.+?)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/;
  const latestMatch = pageText.match(latestReg);
  if(latestMatch){
    result.chapterText = latestMatch[1].trim();
    const timeStr = latestMatch[2].trim();
    result.agoText = formatAbsTimeToAgo(timeStr);
  }
  // 字数
  const wordReg = /([\d\.]+)\s*万\s*字/;
  const wordMatch = pageText.match(wordReg);
  if(wordMatch){
    result.wordCount = `${wordMatch[1]} 万字`;
  }

  return result;
}

function formatAbsTimeToAgo(timeStr) {
  const target = new Date(timeStr).getTime();
  const now = Date.now();
  const diffMs = now - target;
  if (diffMs < 0) return '刚刚';
  const diffHour = diffMs / (1000 * 60 * 60);
  const diffDay = diffHour / 24;
  if (diffDay >= 1) {
    return `${Math.floor(diffDay)} 天前`;
  } else {
    return `${Math.floor(diffHour)} 小时前`;
  }
}
