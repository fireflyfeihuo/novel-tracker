const KEY = 'novels';

export async function getNovels() {
  const r = await chrome.storage.local.get(KEY);
  return r[KEY] || {};
}

export async function saveNovels(novels) {
  await chrome.storage.local.set({ [KEY]: novels });
}

export async function upsertNovel(novel) {
  const novels = await getNovels();
  novels[novel.id] = novel;
  await saveNovels(novels);
}

export async function deleteNovel(id) {
  const novels = await getNovels();
  delete novels[id];
  await saveNovels(novels);
}

// 从 URL 生成稳定 id，避免重复添加同一本书
export function makeId(url, platform) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/[^a-zA-Z0-9]/g, '_');
    return `${platform}${path}`;
  } catch {
    return `${platform}_${Date.now()}`;
  }
}
