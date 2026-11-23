const listEl = document.getElementById('list');
const emptyTip = document.getElementById('empty-tip');

const platformNames = {
  qidian: '起点',
  fanqie: '番茄',
  ciweimao: '刺猬猫',
  shaonianmeng: '少年梦',
  duyuedu: '独阅读',
  xirang: '联合阅读',
  unknown: '未知平台'
};

// 本地平台识别（与 background 的 detectPlatform 保持一致）
function detectPlatformLocal(url) {
  if (url.includes('qidian.com')) return 'qidian';
  if (url.includes('fanqienovel.com')) return 'fanqie';
  if (url.includes('ciweimao.com')) return 'ciweimao';
  if (url.includes('shaoniandream')) return 'shaonianmeng';
  if (url.includes('nkwwlkj.cn')) return 'duyuedu';
  if (url.includes('unionread.net')) return 'xirang';
  return 'unknown';
}

// 固定列出的平台筛选项（顺序即展示顺序）
const platformOptions = ['qidian', 'fanqie', 'ciweimao', 'shaonianmeng', 'duyuedu','xirang'];
const statusOptions = [
  { key: 'all', label: '全部' },
  { key: '连载', label: '连载' },
  { key: '完本', label: '完本' },
  { key: '断更', label: '断更' },
  { key: '太监', label: '太监' }
];

// 筛选与视图状态
let filterPlatform = 'all';
let filterStatus = 'all';
let viewMode = localStorage.getItem('novel_view') || 'grid';

// 状态过滤：完本 -> 已完结，连载 -> 连载中，其余等值匹配
function matchStatus(book, filter) {
  if (filter === 'all') return true;
  if (filter === '连载') return book.status === '连载中';
  if (filter === '完本') return book.status === '已完结';
  return book.status === filter;
}

function applyViewMode() {
  document.body.classList.toggle('list-view', viewMode === 'list');
  document.getElementById('view-grid').classList.toggle('active', viewMode === 'grid');
  document.getElementById('view-list').classList.toggle('active', viewMode === 'list');
  localStorage.setItem('novel_view', viewMode);
}

// 渲染平台筛选按钮（只渲染书架里实际出现过的平台）
function renderPlatformFilter(novels) {
  const group = document.getElementById('platform-filter');
  const present = new Set(Object.values(novels).map(n => n.platform));
  const options = ['all', ...platformOptions.filter(p => present.has(p))];

  group.innerHTML = '';
  options.forEach((key) => {
    const btn = document.createElement('button');
    btn.textContent = key === 'all' ? '全部' : (platformNames[key] || key);
    btn.dataset.platform = key;
    btn.classList.toggle('active', filterPlatform === key);
    btn.addEventListener('click', () => {
      filterPlatform = key;
      render();
    });
    group.appendChild(btn);
  });
}

// 渲染状态筛选按钮
function renderStatusFilter() {
  const group = document.getElementById('status-filter');
  group.innerHTML = '';
  statusOptions.forEach((opt) => {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    btn.dataset.status = opt.key;
    btn.classList.toggle('active', filterStatus === opt.key);
    btn.addEventListener('click', () => {
      filterStatus = opt.key;
      render();
    });
    group.appendChild(btn);
  });
}

async function render() {
  const { novels = {} } = await chrome.storage.local.get('novels');

  renderPlatformFilter(novels);
  renderStatusFilter();
  applyViewMode();

  const sortedNovels = Object.values(novels)
    .filter((n) => {
      const okPlatform = filterPlatform === 'all' || n.platform === filterPlatform;
      const okStatus = matchStatus(n, filterStatus);
      return okPlatform && okStatus;
    })
    .sort((a, b) => {
      return new Date(b.latestUpdateTime || 0) - new Date(a.latestUpdateTime || 0);
    });

  listEl.innerHTML = '';
  emptyTip.hidden = sortedNovels.length > 0;

  sortedNovels.forEach((n) => {
    const card = document.createElement('div');
    card.className = 'card';

    const badgeClass =
      n.status === '太监' ? 'dead' :
      n.status === '断更' ? 'stopped' :
      n.status === '连载中' ? 'serial' :
      n.status === '已完结' ? 'finished' :
      'unknown';

    const platformName = platformNames[n.platform] || n.platform;
    const platformClass = `platform-tag platform-${n.platform || 'unknown'}`;
    const displayTime = n.latestUpdateTime
      ? new Date(n.latestUpdateTime).toLocaleString('zh-CN', { hour12: false })
      : '-';

    card.innerHTML = `
      <span class="${platformClass}">${platformName}</span>
      <h3>${n.title || '(未获取书名)'}</h3>
      <div class="info">
        <div class="row">作者：${n.author || '-'}</div>
        <div class="row">状态：
          <span class="badge ${badgeClass}">${n.status}</span>
          ${n.statusLocked ? ' <span style="color:#f44336;font-size:12px;">(已锁定)</span>' : ''}
        </div>
        <div class="row">距上次更新：<strong style="color:${n.daysSinceLastUpdate > 10 ? '#f44336' : '#333'}">${n.daysSinceLastUpdate || 0} 天</strong></div>
        <div class="row">字数：${n.wordCount || '-'}</div>
        <div class="row">最新章节：${n.latestChapter || '-'}</div>
        <div class="row">更新时间：${displayTime}</div>
      </div>
      <div class="actions">
        <button data-act="open" data-id="${n.id}">开始阅读</button>
        <button data-act="update" data-id="${n.id}">立即更新</button>
        <button data-act="lock" data-id="${n.id}">手动改状态</button>
        <button data-act="delete" data-id="${n.id}">删除</button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const { act, id } = btn.dataset;

  // 开始阅读：直接打开书籍链接
  if (act === 'open') {
    const { novels } = await chrome.storage.local.get('novels');
    const book = novels[id];
    if (book?.url) chrome.tabs.create({ url: book.url });
    return;
  }

  btn.disabled = true;

  if (act === 'update') {
    const { novels } = await chrome.storage.local.get('novels');
    await chrome.runtime.sendMessage({ type: 'UPDATE_ONE', novel: novels[id] }).catch(console.error);
  }
  if (act === 'lock') {
    const status = prompt('输入状态（连载中 / 断更 / 太监 / 已完结）');
    if (status) await chrome.runtime.sendMessage({ type: 'SET_STATUS', id, status }).catch(console.error);
  }
  if (act === 'delete') {
    if (confirm('确定要删除这本书吗？')) {
      await chrome.runtime.sendMessage({ type: 'DELETE', id }).catch(console.error);
    }
  }

  btn.disabled = false;
  render();
});

// 视图切换
document.getElementById('view-grid').addEventListener('click', () => {
  viewMode = 'grid';
  render();
});
document.getElementById('view-list').addEventListener('click', () => {
  viewMode = 'list';
  render();
});

document.getElementById('add').addEventListener('click', async () => {
  const urlInput = document.getElementById('url');
  const url = urlInput.value.trim();
  if (!url) return;

  const btn = document.getElementById('add');
  btn.textContent = '添加中...';
  btn.disabled = true;

  const response = await chrome.runtime.sendMessage({ type: 'ADD_BOOK', url }).catch(err => ({ ok: false, error: err.message }));

  btn.textContent = '添加书籍';
  btn.disabled = false;

  if (response?.ok) {
    urlInput.value = '';
    render();
  } else {
    alert(`添加失败: ${response?.error || response?.reason || '请查看控制台'}`);
  }
});

document.getElementById('refresh').addEventListener('click', async () => {
  const btn = document.getElementById('refresh');
  btn.textContent = '更新中...';
  btn.disabled = true;

  await chrome.runtime.sendMessage({ type: 'UPDATE_ALL' }).catch(console.error);

  btn.textContent = '全部更新';
  btn.disabled = false;
  render();
});

/* ===== 批量导入：从 html / txt 文件识别书籍链接 ===== */
const importBtn = document.getElementById('import-btn');
const importFiles = document.getElementById('import-files');
const importResult = document.getElementById('import-result');

// 从文本中提取 http(s) 及协议相对 URL
function extractUrls(text, isHtml) {
  const urls = [];
  if (isHtml) {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    doc.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (href) urls.push(href);
    });
  }
  const URL_RE = /https?:\/\/[^\s"'<>\\]+|\/\/[^\s"'<>\\]+/gi;
  let m;
  while ((m = URL_RE.exec(text)) !== null) urls.push(m[0]);

  return urls
    .map((u) => {
      let clean = u.trim().replace(/[.,;，。、）)】\]>]+$/, '');
      if (clean.startsWith('//')) clean = 'https:' + clean;
      return clean;
    })
    .filter((u) => /^https?:\/\//i.test(u));
}

function renderImportResult(results) {
  const counts = { success: 0, exists: 0, unsupported: 0, error: 0 };
  results.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });

  const tagMap = {
    success: ['tag-success', '导入成功'],
    exists: ['tag-exists', '已存在'],
    unsupported: ['tag-unsupported', '暂不支持'],
    error: ['tag-error', '失败']
  };

  importResult.hidden = false;
  importResult.innerHTML = `
    <div class="import-summary">
      共识别 ${results.length} 个链接：
      <span class="count" style="color:#4caf50">成功 ${counts.success}</span>
      <span class="count" style="color:#9e9e9e">已存在 ${counts.exists}</span>
      <span class="count" style="color:#ff9800">暂不支持 ${counts.unsupported}</span>
      <span class="count" style="color:#f44336">失败 ${counts.error}</span>
    </div>
    <ul class="import-detail">
      ${results.map((r) => {
        const [cls, label] = tagMap[r.status] || tagMap.error;
        const plat = platformNames[r.platform] || '未知';
        return `<li>
          <span class="import-tag ${cls}">${label}</span>
          <span class="url" title="${r.url}">[${plat}] ${r.url}</span>
        </li>`;
      }).join('')}
    </ul>
  `;
}

async function doImport(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  importBtn.disabled = true;
  importBtn.textContent = '导入中...';
  importResult.hidden = true;

  const { novels = {} } = await chrome.storage.local.get('novels');
  const existingUrls = new Set(Object.values(novels).map((n) => n.url));

  // 读取全部文件并提取、去重链接
  const uniqueUrls = [];
  const seen = new Set();
  for (const file of files) {
    const text = await file.text();
    const isHtml = /\.html?$/i.test(file.name);
    for (const url of extractUrls(text, isHtml)) {
      const key = url.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueUrls.push(url);
      }
    }
  }

  const results = [];
  for (const url of uniqueUrls) {
    const platform = detectPlatformLocal(url);

    if (existingUrls.has(url)) {
      results.push({ url, platform, status: 'exists' });
      continue;
    }
    if (platform === 'unknown') {
      results.push({ url, platform, status: 'unsupported' });
      continue;
    }

    const resp = await chrome.runtime.sendMessage({ type: 'ADD_BOOK', url })
      .catch((e) => ({ ok: false, error: e.message }));

    if (resp?.ok) {
      existingUrls.add(url);
      results.push({ url, platform, status: 'success' });
    } else if (resp?.reason === '已存在') {
      results.push({ url, platform, status: 'exists' });
    } else {
      results.push({ url, platform, status: 'error' });
    }
  }

  renderImportResult(results);
  importBtn.disabled = false;
  importBtn.textContent = '批量导入';
  render();
}

importBtn.addEventListener('click', () => importFiles.click());
importFiles.addEventListener('change', () => {
  doImport(importFiles.files);
  importFiles.value = '';
});

chrome.storage.onChanged.addListener(render);
render();
//（注：内容由AI生成）
