# 小说追踪器 — 使用说明 & 自行新增站点开发文档
## 一、插件简介
> Chrome Manifest V3 本地小说追更插件，**所有数据保存在浏览器本地存储，不上传网络**。
支持平台：起点中文网、番茄小说、刺猬猫、少年梦、独阅读、**联合阅读（息壤）**

## 二、安装使用
### 1、本地加载扩展
1. 打开 `chrome://extensions/`，打开右上角「开发者模式」
2. 点击「加载已解压的扩展程序」，选中项目根目录 `novel‑tracker`
3. 扩展图标出现在浏览器工具栏；点击图标，打开书架页面（独立网页弹窗）

> ⚠️修改代码之后，务必在扩展管理页点击**重新加载**，修改才会生效。

### 2、基础操作
1. **添加书籍**
- 将书籍详情页完整URL粘贴输入框，点击【添加书籍】。
- 系统自动抓取书名、作者、状态、字数、最新章节、更新时间。

> 📌【联合阅读（unionread.net）重要备注】
> **联合阅读部分书籍需要登录账号后页面才展示完整内容。后台静默抓取时如果未登录，会拿到空白信息。**
> 解决：
> ① 浏览器先打开联合阅读网页完成登录；
> ② 再添加/更新联合阅读书籍；
> ③ 如果依旧抓空，后台标签页会受浏览器后台休眠节流，可修改代码将联合阅读设置为前台激活打开标签。

2. **单本书立即更新**：卡片上点【立即更新】，单独刷新这本书信息。
3. **全部更新**：顶部按钮【全部更新】，批量刷新书架全部书籍；插件内置定时，每12小时自动全部更新。
4. **手动修改状态**：点击【手动改状态】，输入：`连载中 / 断更 / 太监 / 已完结`，该状态会被锁定，不会被自动更新覆盖。
5. **开始阅读**：直接在新标签打开书籍网页。
6. **删除书籍**：从本地书架移除。

3. **视图切换**
右上角切换：**平铺模式 / 列表模式**，视图选择自动保存在本地。

4. **筛选**
顶部筛选栏：按平台、按状态筛选书架。

5. **批量导入**
支持导入 `.txt` / `.html` 文件，自动提取里面全部小说链接批量加入书架。
- txt：一行多条网址；
- html：从网页a标签提取href链接；
> 仅识别项目已经支持的站点链接，不支持的网站标记「暂不支持」。

### 状态规则说明
|状态|说明|
|---|---|
|连载中|网站标记连载，或者断更天数≤10天|
|断更|连续11‑30天没有更新|
|太监|连续大于30天没有更新|
|已完结|网站标记完结；手动锁定不受天数规则影响|

> 部分网站**页面没有原生更新时间**（如独阅读），插件启用本地缓存计时：对比章节标题，如果章节不变，则沿用上次更新时间；章节变化则更新时间置为当前抓取时刻。

### 调试排错
1. 书架看不到书：大概率 JS 语法报错，打开popup页面F12控制台看红色报错。**存储数据不会丢失，脚本崩溃只是不渲染界面。**
2. 更新抓取为空：打开Service‑Worker后台控制台，查看 `debug_log`，查看`parsed`对象输出，确认解析器返回字段。
3. SPA网页抓取失败：调高`retryDelay`延时；必要时改为前台激活标签页`active:true`。

## 三、自行新增小说站点开发文档
> 新增站点一共要修改**5处文件**，缺一不可。

### 文件总览
```
novel‑tracker/
├─ parsers/
│  ├─ xxx.js        # ✅1、新建解析器文件
│  └─ index.js       # ✅2、注册解析器 + 域名识别
├─ background/service‑worker.js # ✅3、SPA站点加入长等待延时列表
├─ popup.js          # ✅4、前端：平台显示名称 + 筛选列表 + 本地域名识别
└─ manifest.json     # ✅5、添加host_permissions主机权限
```

### 1. parsers/xxx.js：新建解析器脚本
> ⚠️重点：这个函数会被`chrome.scripting.executeScript`序列化注入网页运行，**函数内部不能import/引用外部变量**。
输出字段规范（必须遵守）
```javascript
// 标准返回对象
const result = {
  title: null,         // 书名
  author: null,        // 作者
  status: null,        // "连载中" / "已完结"
  wordCount: null,     // "XX.XX万字"
  chapterText: null,   // ✅最新章节名（必须是chapterText，不是latestChapter）
  agoText: null        // ✅更新时间：可以是两种格式
                       // 格式A：相对时间 "2天前" "3小时前"
                       // 格式B：绝对时间 "2026‑11‑23 12:30:00"
};
```

模板示例 `parsers/mysite.js`
```javascript
// 注入页面执行，禁止外部import
export function parseMySite() {
  const result = {
    title: null,
    author: null,
    status: null,
    wordCount: null,
    chapterText: null,
    agoText: null
  };
  // 书名选择器，自行修改
  const titleEl = document.querySelector('h1.book‑title');
  if(titleEl) result.title = titleEl.textContent.trim();

  // 作者
  const authorEl = document.querySelector('.author');
  if(authorEl) result.author = authorEl.textContent.replace(/^作者[:：]\s*/,'').trim();

  // 连载状态
  const statusEl = document.querySelector('.book‑status');
  if(statusEl){
    const s = statusEl.textContent.trim();
    if(s.includes('连载')) result.status = "连载中";
    else if(s.includes('完结') || s.includes('完本')) result.status = "已完结";
    else result.status = s;
  }

  // 字数，正则提取
  const text = document.body.innerText;
  const wordMatch = text.match(/(\d+(?:\.\d+)?)\s*万字/);
  if(wordMatch) result.wordCount = wordMatch[0];

  // 最新章节
  const chapEl = document.querySelector('.latest‑chapter');
  if(chapEl) result.chapterText = chapEl.textContent.trim();

  // 更新时间
  const timeEl = document.querySelector('.update‑time');
  if(timeEl) result.agoText = timeEl.textContent.trim();

  return result;
}
```

> 如果网站**完全没有更新时间**，`agoText=null`，插件会自动进入【本地章节比对计时模式】，无需额外修改业务代码。

### 2. parsers/index.js：注册解析器、域名识别
```javascript
// ① import你的解析
import { parseMySite } from './mysite.js';

// ② 添加到PARSERS映射表
const PARSERS = {
  qidian: parseQidian,
  fanqie: parseFanqie,
  ciweimao: parseCiweimao,
  shaonianmeng: parseShaonianmeng,
  duyuedu:parseDuyuedu,
  xirang: parseXirang,
  mysite: parseMySite, //新增
};

// ③ detectPlatform增加域名判断
export function detectPlatform(url) {
  if (url.includes('qidian.com')) return 'qidian';
  if (url.includes('fanqienovel.com')) return 'fanqie';
  if (url.includes('ciweimao.com')) return 'ciweimao';
  if (url.includes('shaoniandream')) return 'shaonianmeng';
  if (url.includes('nkwwlkj.cn')) return 'duyuedu';
  if (url.includes('unionread.net')) return 'xirang';
  if (url.includes('mysite.com')) return 'mysite'; //新增你的站点域名
  return 'unknown';
}
```

### 3. background/service‑worker.js：延时配置
> SPA/Vue/React异步渲染网站，需要加长等待时间；静态HTML网站不需要。
找到这一行
```javascript
const retryDelay = (novel.platform === 'shaonianmeng' || novel.platform === 'qidian' || novel.platform === 'fanqie' || novel.platform === 'xirang') ? 3500 : 1500;
```
把你的平台key加入括号内：
```javascript
const retryDelay = (novel.platform === 'shaonianmeng' || novel.platform === 'qidian' || novel.platform === 'fanqie' || novel.platform === 'xirang' || novel.platform === 'mysite') ? 3500 : 1500;
```

> 若后台静默tab渲染不跑JS，可单独设置`active:true`前台打开标签页（会短暂闪现标签页然后关闭）。

### 4. popup.js：前端UI修改
两处修改：
1. `platformNames`：平台key与中文显示名称映射
```javascript
const platformNames = {
  qidian: '起点',
  fanqie: '番茄',
  ciweimao: '刺猬猫',
  shaonianmeng: '少年梦',
  duyuedu: '独阅读',
  xirang: '联合阅读',
  mysite: '我的站点', //新增
  unknown: '未知平台'
};
```

2. `platformOptions`数组，加入平台key，筛选栏会预注册该平台
```javascript
const platformOptions = ['qidian', 'fanqie', 'ciweimao', 'shaonianmeng', 'duyuedu','xirang','mysite'];
```

3. `detectPlatformLocal()`，增加本地域名匹配，用于**批量导入识别网址**
```javascript
function detectPlatformLocal(url) {
  if (url.includes('qidian.com')) return 'qidian';
  if (url.includes('fanqienovel.com')) return 'fanqie';
  if (url.includes('ciweimao.com')) return 'ciweimao';
  if (url.includes('shaoniandream')) return 'shaonianmeng';
  if (url.includes('nkwwlkj.cn')) return 'duyuedu';
  if (url.includes('unionread.net')) return 'xirang';
  if (url.includes('mysite.com')) return 'mysite'; //新增
  return 'unknown';
}
```

4. popup.css（可选）
增加平台标签颜色样式，没有添加则使用`platform‑unknown`默认灰色：
```css
.platform‑mysite { background: #e8f5e9; color:#2e7d32; }
```

### 5. manifest.json，增加主机权限 host_permissions
```json
"host_permissions": [
    "*://*.qidian.com/*",
    "*://*.fanqienovel.com/*",
    "*://*.ciweimao.com/*",
    "*://*.shaoniandream.com/*",
    "*://*.nkwwlkj.cn/*",
    "*://*.unionread.net/*",
    "*://*.mysite.com/*"   //新增站点域名，末尾必须带 /*
]
```

## 四、新增站点排错清单
1. ⚠️解析器返回字段**必须使用 `chapterText / agoText`，禁止使用旧字段`latestChapter / latestUpdateTime`，后台`applyUpdate`不会识别旧字段。
2. 全部符号必须英文半角，逗号、冒号，中文符号直接导致脚本崩溃。
3. SPA网页：`retryDelay`不够就继续加大，最高可到5000。
4. manifest的host_permissions域名末尾必须带`/*`。
5. 修改全部文件后，**一定要扩展页面重新加载**；旧的已经添加书籍建议删除后重新添加测试。
6. 查看Service‑Worker控制台debug_log打印的parsed对象，确认解析器输出。

> 测试步骤：粘贴站点书籍url添加，看是否正常抓取书名、作者、章节、更新时间。

如果你需要，我可以把这份文档输出为纯markdown文本，方便保存为本地readme.md。<img width="1123" height="445" alt="未命名_1" src="https://github.com/user-attachments/assets/ac550755-994f-4523-8cd2-37e4a899623f" />
<img width="1060" height="358" alt="未命名" src="https://github.com/user-attachments/assets/7c8e5bbd-893a-4df5-bdb6-9c51e026db3a" />
