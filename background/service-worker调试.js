import { getNovels, upsertNovel, makeId } from './storage.js';
import { getParser, detectPlatform } from '../parsers/index.js';

const ALARM_NAME = 'update-all';
const CHECK_INTERVAL_MINUTES = 12 * 60;

// 监听插件图标点击，打开独立网页
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('pages/popup.html') });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_INTERVAL_MINUTES });
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === ALARM_NAME) updateAll();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handle = async () => {
    try {
      if (msg.type === 'ADD_BOOK') {
        const r = await addBook(msg.url);
        sendResponse(r);
      } else if (msg.type === 'UPDATE_ALL') {
        await updateAll();
        sendResponse({ ok: true });
      } else if (msg.type === 'UPDATE_ONE') {
        await updateOne(msg.novel);
        sendResponse({ ok: true });
      } else if (msg.type === 'SET_STATUS') {
        await setStatusLocked(msg.id, msg.status);
        sendResponse({ ok: true });
      } else if (msg.type === 'DELETE') {
        await deleteBook(msg.id);
        sendResponse({ ok: true });
      }
    } catch (err) {
      console.error('处理消息出错:', msg.type, err);
      sendResponse({ ok: false, error: err.message });
    }
  };
  handle();
  return true;
});

async function addBook(url) {
  const platform = detectPlatform(url);
  const id = makeId(url, platform);
  const novels = await getNovels();
  if (novels[id]) return { ok: false, reason: '已存在' };

  const novel = {
    id, url, platform,
    title: null, author: null,
    status: '未知', statusLocked: false,
    wordCount: null, latestChapter: null,
    latestUpdateTime: null, lastCheckTime: null,
    daysSinceLastUpdate: 0,
    cachedLastChapter: null,
    cachedUpdateTs: null
  };
  await upsertNovel(novel);
  await updateOne(novel);
  return { ok: true };
}

async function updateAll() {
  const novels = await getNovels();
  for (const n of Object.values(novels)) {
    await updateOne(n);
  }
}

async function updateOne(novel) {
  let tab = null;
  try {
    if (novel.platform === 'xirang') {
      // =====息壤：前台激活标签页=====
      tab = await chrome.tabs.create({ url: novel.url, active: true });
      await waitForTabComplete(tab.id);
      await sleep(5500);
    } else {
      tab = await chrome.tabs.create({ url: novel.url, active: false });
      await waitForTabComplete(tab.id);
    }

    let parsed = {};
    const retryDelay = novel.platform === 'xirang' ? 2200 : 1500;

    // =====【调试：息壤不再调用parser，直接拿页面原始文本】=====
    if (novel.platform === 'xirang') {
      for (let i = 0; i < 4; i++) {
        await sleep(retryDelay);
        const [injection] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // 直接返回页面前2000字符纯文本，不跑解析器
            return { rawText: document.body.innerText.substring(0, 2000) };
          }
        });
        const res = injection.result || {};
        parsed = { ...parsed, ...res };
        console.log(`xirang 第${i+1}次原始页面：`, res);
        // 如果页面已经出现“作者：”关键词，就停止重试
        if (parsed.rawText && parsed.rawText.includes('作者：')) {
          break;
        }
      }
    } else {
      // 其他网站：正常走原来parser解析逻辑
      const parser = getParser(novel.platform);
      for (let i = 0; i < 4; i++) {
        await sleep(retryDelay);
        const [injection] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: parser
        });
        const res = injection.result || {};
        parsed = { ...parsed, ...res };
        if (res.title && res.author && res.chapterText) break;
      }
    }

    console.log('最终 parsed', parsed);
    // 写入调试日志
    const debugLog = await chrome.storage.local.get('debug_log') || {};
    const logArr = debugLog.debug_log || [];
    logArr.push({
      time: new Date().toLocaleString(),
      url: novel.url,
      parsed: parsed
    });
    if (logArr.length > 20) logArr.shift();
    await chrome.storage.local.set({ debug_log: logArr });

    const updated = applyUpdate(novel, parsed);
    await upsertNovel(updated);
  } catch (err) {
    console.error('更新失败', novel.url, err);
    throw err;
  } finally {
    if (tab?.id) chrome.tabs.remove(tab.id).catch(() => { });
  }
}

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 无原生更新时间站点：比对章节、维护本地缓存时间
 * @param {object} book
 * @param {string} newChapter
 * @returns {{latestChapter:string, newUpdateTs:number, diffDays:number}}
 */
function calcLocalUpdateTime(book, newChapter) {
  const nowTs = Date.now();
  let targetTs;
  if (!book.cachedLastChapter || !book.cachedUpdateTs) {
    // 首次抓取
    book.cachedLastChapter = newChapter;
    book.cachedUpdateTs = nowTs;
    targetTs = nowTs;
  } else {
    if (book.cachedLastChapter !== newChapter) {
      // 章节更新，刷新时间
      book.cachedLastChapter = newChapter;
      book.cachedUpdateTs = nowTs;
      targetTs = nowTs;
    } else {
      // 章节不变，沿用旧时间
      targetTs = book.cachedUpdateTs;
    }
  }
  const diffMs = nowTs - targetTs;
  const diffDays = Math.floor(diffMs / 86400000);
  return {
    latestChapter: newChapter,
    newUpdateTs: targetTs,
    diffDays
  };
}

function applyUpdate(novel, parsed) {
  const nowTs = Date.now();
  const nowIso = new Date(nowTs).toISOString();
  const u = { ...novel };

  // 息壤现在拿到的是rawText，没有title/author，直接跳过赋值
  if (novel.platform !== 'xirang') {
    if (parsed.title) u.title = parsed.title;
    if (parsed.author) u.author = parsed.author;
    if (parsed.wordCount) u.wordCount = parsed.wordCount;
  }

  u.lastCheckTime = nowIso;

  if (parsed.chapterText) {
    if (parsed.agoText) {
      // ========== 站点自带更新时间，原有逻辑，不走本地章节缓存 ==========
      u.latestChapter = `${parsed.chapterText} (${parsed.agoText})`;
      const hourReg = /(\d+)\s*小时前/;
      const dayReg = /(\d+)\s*天前/;
      const hourMatch = parsed.agoText.match(hourReg);
      const dayMatch = parsed.agoText.match(dayReg);
      if (hourMatch) {
        const h = Number(hourMatch[1]);
        const realTs = nowTs - h * 60 * 60 * 1000;
        u.latestUpdateTime = new Date(realTs).toISOString();
      } else if (dayMatch) {
        const d = Number(dayMatch[1]);
        const realTs = nowTs - d * 24 * 60 * 60 * 1000;
        u.latestUpdateTime = new Date(realTs).toISOString();
      }
      // 计算间隔天数
      const lastTs = new Date(u.latestUpdateTime).getTime();
      const diffMs = nowTs - lastTs;
      u.daysSinceLastUpdate = diffMs > 0 ? Math.floor(diffMs / 86400000) : 0;
    } else {
      // ========== 无原生更新时间，启用本地章节比对计时 ==========
      const localRes = calcLocalUpdateTime(u, parsed.chapterText);
      u.latestChapter = localRes.latestChapter;
      u.latestUpdateTime = new Date(localRes.newUpdateTs).toISOString();
      u.daysSinceLastUpdate = localRes.diffDays;
    }
  }

  if (!u.statusLocked) {
    if (parsed.status === '已完结') {
      u.status = '已完结';
    } else {
      if (u.daysSinceLastUpdate > 30) u.status = '太监';
      else if (u.daysSinceLastUpdate > 10) u.status = '断更';
      else u.status = parsed.status || '连载中';
    }
  }
  return u;
}

async function setStatusLocked(id, status) {
  const novels = await getNovels();
  if (!novels[id]) return;
  novels[id].status = status;
  novels[id].statusLocked = true;
  await upsertNovel(novels[id]);
}

async function deleteBook(id) {
  const novels = await getNovels();
  delete novels[id];
  await chrome.storage.local.set({ novels });
}
