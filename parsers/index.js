import { parseQidian } from './qidian.js';
import { parseFanqie } from './fanqie.js';
import { parseCiweimao } from './ciweimao.js';
import { parseShaonianmeng } from './shaonianmeng.js';
import { parseDuyuedu } from './duyuedu.js';

const PARSERS = {
  qidian: parseQidian,
  fanqie: parseFanqie,
  ciweimao: parseCiweimao,
  shaonianmeng: parseShaonianmeng,
  duyuedu:parseDuyuedu,
};

export function getParser(platform) {
  return PARSERS[platform] || parseGeneric;
}

function parseGeneric() {
  const text = document.body.innerText;
  return {
    title: document.querySelector('h1')?.textContent.trim() || null,
    author: null,
    status: text.match(/(连载中|已完结|完本)/)?.[1] || null,
    wordCount: text.match(/(\d+(?:\.\d+)?)\s*万字/)?.[0] || null,
    latestChapter: null,
    latestUpdateTime: null
  };
}

export function detectPlatform(url) {
  if (url.includes('qidian.com')) return 'qidian';
  if (url.includes('fanqienovel.com')) return 'fanqie';
  if (url.includes('ciweimao.com')) return 'ciweimao';
  if (url.includes('shaoniandream')) return 'shaonianmeng';
  if (url.includes('nkwwlkj.cn')) return 'duyuedu';
  // 删除这一行： if (url.includes('xr.unionread.net')) return 'xirang';
  return 'unknown';
}
