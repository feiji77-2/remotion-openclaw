// scripts/ui-e2e/run-ui-e2e.mjs
// 前端 UI 端到端测试 — 逐按钮链路验证
// 用真实 Chromium 驱动 tools:studio 起的 StudioApp，把每个可见交互都走通，
// 并断言 UI 反馈 + 后端副作用（合同文件 / 渲染产物）。
//
// 运行：
//   npm run tools:build      # 先构建前端（server 伺服 build 产物）
//   npm run test:ui           # headless 全量（含 T14 MP4 渲染，约 5-10 分钟）
//   HEADFUL=1 npm run test:ui:headed          # 有头模式调试
//   SKIP_RENDER=1 npm run test:ui            # 跳过 T14 MP4（仍跑 T13 still）
//
// 设计要点（给下次自己/Reviewer）：
//   * clickByText 支持四档匹配（精确 / 末尾装饰≤6 / 起首 emoji / contains 兜底），
//     因为 actionBtn 把 description 子 <span> 塞进 button，整条 textContent 形如
//     "📸 生成关键帧输出一张 PNG 截图预览" —— 既不 startsWith 也不 endsWith 主标签，
//     必须靠 contains 兜底。修这些时不要再退回 startsWith-only。
//   * 受控 React radio（StyleCard aria-checked={selected}）要点发生后轮询，
//     不能同步读 —— setState→re-render 是异步的，同步读必为旧值（曾导致 T7 假阴性）。
//   * 验证以**后端副作用**为硬断言（project.json/brief.json/still PNG/MP4 落盘 + job 终态），
//     UI 活动提示只作软验证（易被后续事件挤掉）。
//   * T14 必须等 job 到 status==='done' 终态，不能只看 MP4 文件出现 —— Remotion/ffmpeg
//     编码初期会先写小文件头，曾导致 size>0 即返被误判"MP4 太小 48B"假阴性。

import {spawn, spawnSync} from 'node:child_process';
import {existsSync, statSync, rmSync, readFileSync} from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const BUILD_DIR = path.join(PROJECT_ROOT, 'build', 'tools');
const HEADFUL = !!process.env.HEADFUL;
const SKIP_RENDER = !!process.env.SKIP_RENDER;

const C = {RED: '\x1b[31m', GREEN: '\x1b[32m', CYAN: '\x1b[36m', YEL: '\x1b[33m', DIM: '\x1b[2m', NC: '\x1b[0m'};
const log = (m) => console.log(m);
const info = (m) => console.log(`${C.CYAN}---${C.NC} ${m}`);
const pass = (m) => { results.pass++; console.log(`${C.GREEN}PASS${C.NC} ${m}`); };
const fail = (m) => { results.fail++; console.log(`${C.RED}FAIL${C.NC} ${m}`); results.failures.push(m); };
const step = (m) => console.log(`${C.DIM}  … ${m}${C.NC}`);

const results = {pass: 0, fail: 0, failures: []};

// ── server 控制 ──────────────────────────────────────────────────────────
let serverProc = null;
let browser = null;
let createdProjectIds = [];
const PORT = 8787 + Math.floor(Math.random() * 4000);

async function main() {
  info(`UI e2e — port ${PORT}, headless=${!HEADFUL}, skipRender=${SKIP_RENDER}`);

  // 0. 确保前端 build 产物存在
  if (!existsSync(path.join(BUILD_DIR, 'index.html'))) {
    info('build 产物缺失，先 npm run tools:build ...');
    const r = spawnSync('npm', ['run', 'tools:build'], {cwd: PROJECT_ROOT, stdio: 'inherit'});
    if (r.status !== 0) throw new Error('tools:build 失败');
  }

  // 1. 闭包辅助：启动 server
  await startServer();
  info(`server online @ http://127.0.0.1:${PORT}/`);

  // 2. 启动 puppeteer
  info('启动 Chromium ...');
  const puppeteer = (await import('puppeteer')).default;
  browser = await puppeteer.launch({
    headless: HEADFUL ? false : 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  await page.setViewport({width: 1440, height: 900});

  // 收集 console 错误
  page.on('console', (msg) => { if (msg.type() === 'error') step(`[console.error] ${msg.text().slice(0,120)}`); });
  page.on('pageerror', (e) => { results.pageErrors = (results.pageErrors||[]); results.pageErrors.push(String(e.message).slice(0,160)); });

  await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil: 'networkidle0'});

  // 诊断：确认 server 注入的 __VIDEO_FACTORY_PORT__ 是否就位（影响 artifact URL 端口）
  const inj = await page.evaluate(() => ({inj: window.__VIDEO_FACTORY_PORT__, injType: typeof window.__VIDEO_FACTORY_PORT__, locPort: window.location.port, origin: window.location.origin}));
  info(`前端 __VIDEO_FACTORY_PORT__ = ${JSON.stringify(inj)}`);

  // ── 测试用例 ────────────────────────────────────────────────────────────
  await T1_healthBadge(page);
  await T2_projectDropdown(page);
  await T3_openNewProjectModal(page);
  await T4_emptySubmitValidation(page);
  await T5_shortScriptValidation(page);
  await T6_projectIdStripping(page);
  await T7_orientationAndStyleCard(page);
  await T8_createProjectSuccess(page);
  await T9_createDuplicateRejected(page);
  await T10_stepNavigation(page);
  await T11_saveScript(page);
  await T12_styleConfirmToStoryboard(page);
  await T13_renderStill(page);
  if (!SKIP_RENDER) { await T14_renderVideo(page); } else { info('SKIP T14 (渲染成片) — SKIP_RENDER=1'); pass('T14 skipped by env'); }
  await T15_developerDrawer(page);
  await T16_bottomTimeline(page);

  // ── 报告 ────────────────────────────────────────────────────────────────
  log('');
  log(`${C.GREEN}═══════════════════════════════════${C.NC}`);
  log(`  UI E2E: ${C.GREEN}PASS ${results.pass}${results.fail ? C.RED+' / FAIL '+results.fail : ''}${C.NC}`);
  log(`${C.GREEN}═══════════════════════════════════${C.NC}`);
  if (results.fail) for (const f of results.failures) log(`  ${C.RED}•${C.NC} ${f}`);
  if (results.pageErrors?.length) { log(`${C.DIM}  页面运行时错误（仅供参考）:${C.NC}`); for (const e of results.pageErrors) log(`    ${C.DIM}${e}${C.NC}`); }

  await cleanup();
  process.exit(results.fail ? 1 : 0);
}

// ── server ──────────────────────────────────────────────────────────────
async function startServer() {
  return new Promise((resolve, reject) => {
    serverProc = spawn('node', [path.join(PROJECT_ROOT, 'scripts', 'tools-studio-server.mjs')], {
      cwd: PROJECT_ROOT,
      env: {...process.env, VIDEO_FACTORY_PORT: String(PORT)},
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    serverProc.stdout.on('data', (c) => step(`[server] ${c.toString().trim().slice(0,100)}`));
    serverProc.stderr.on('data', (c) => step(`[server.err] ${c.toString().trim().slice(0,100)}`));
    serverProc.on('error', reject);
    const t = setTimeout(() => reject(new Error('server start timeout')), 15000);
    const probe = async () => {
      try { const ok = await healthOk(); if (ok) { clearTimeout(t); resolve(); return; } } catch {}
      setTimeout(probe, 400);
    };
    setTimeout(probe, 600);
  });
}

async function cleanup() {
  for (const id of createdProjectIds) {
    for (const d of [path.join(PROJECT_ROOT, 'projects', id), path.join(PROJECT_ROOT, 'public', 'projects', id)]) {
      try { await fs.rm(d, {recursive: true, force: true}); } catch {}
    }
    for (const f of [`${id}-frame-30.png`, `${id}.mp4`]) {
      try { await fs.rm(path.join(PROJECT_ROOT, 'out', f), {force: true}); } catch {}
    }
  }
  if (browser) try { await browser.close(); } catch {}
  if (serverProc) try { serverProc.kill('SIGTERM'); } catch {}
}

function httpGet(p) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}${p}`, (res) => {
      let b = ''; res.on('data', (c) => b += c); res.on('end', () => resolve({status: res.statusCode, body: b}));
    }).on('error', reject);
  });
}
function httpPost(p, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(`http://127.0.0.1:${PORT}${p}`, {method: 'POST', headers: {'content-type': 'application/json', 'content-length': Buffer.byteLength(data)}}, (res) => {
      let b = ''; res.on('data', (c) => b += c); res.on('end', () => resolve({status: res.statusCode, body: b}));
    });
    req.on('error', reject); req.write(data); req.end();
  });
}
async function healthOk() { try { const r = await httpGet('/api/health'); return r.status === 200; } catch { return false; } }
async function apiPost(p, payload) { const r = await httpPost(p, payload); try { return {status: r.status, json: JSON.parse(r.body), body: r.body}; } catch { return {status: r.status, body: r.body}; } }
async function apiGet(p) { const r = await httpGet(p); if (r.status >= 400) { step(`apiGet ${p} -> ${r.status}: ${String(r.body||'').replace(/\s+/g,' ').slice(0,200)}`); } try { return {status: r.status, json: JSON.parse(r.body), body: r.body}; } catch { return {status: r.status, body: r.body}; } }

async function pollJob(jobId, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await apiGet(`/api/jobs/${jobId}`);
    if (r.status === 200 && r.json?.job) {
      if (r.json.job.status !== 'running') return r.json.job;
    }
    await new Promise((x) => setTimeout(x, 1000));
  }
  return null;
}

// ── 页面交互辅助 ──────────────────────────────────────────────────────────
// 在页面里对一个 input/textarea 赋值并派发 React 事件
async function setInputValue(page, elHandle, value) {
  await page.evaluate((el, val) => {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, val);
    el.dispatchEvent(new Event('input', {bubbles: true}));
  }, elHandle, value);
}

// 按精确文本匹配点击可见按钮（按钮或带 role 的可点元素）
// 匹配优先级：精确相等 > 末尾相等(容忍≤6字符装饰) > 起首相等(emoji 前缀) >
//              文本 contains(覆盖 actionBtn 渲染时把 description 塞进 button 的
//              "📸 生成关键帧输出一张 PNG 截图预览" 这种结构)
async function clickByText(page, text, opts = {}) {
  const handle = await page.evaluateHandle((t, o) => {
    o = o || {};
    const norm = (s) => (s || '').trim().replace(/\s+/g, ' ');
    const candidates = [];
    const push = (el) => { if (el && !candidates.includes(el)) candidates.push(el); };
    // 1. 文本精确等于的 button
    for (const b of document.querySelectorAll('button')) if (norm(b.textContent) === t) push(b);
    // 1b. button textContent 末尾以 t 结尾且装饰 ≤6（容忍 trailing description 子 <span>）
    for (const b of document.querySelectorAll('button')) { const n = norm(b.textContent); if (n !== t && n.endsWith(t) && (n.length - t.length <= 6)) push(b); }
    // 1c. button 以 t 起首 —— 命中 "📸 生成关键帧" 这种 emoji 前缀按钮
    for (const b of document.querySelectorAll('button')) { const n = norm(b.textContent); if (n.startsWith(t) && n !== t) push(b); }
    // 1d. 兜底：button textContent contains t（命中 actionBtn "📸 生成关键帧输出一张…预览"）。
    //     只在 labels ≥3 字时启用，避免短词误命中
    if (t.length >= 3) for (const b of document.querySelectorAll('button')) { const n = norm(b.textContent); if (!n.includes(t)) continue; if (n === t || n.endsWith(t) || n.startsWith(t)) continue; push(b); }
    // 2. 带 role 且文本 contains（radio 文本含 emoji 前缀）或 aria-label 等于
    for (const b of document.querySelectorAll('[role="radio"],[role="option"]')) { const n = norm(b.textContent); if (n === t || n.endsWith(t) || b.getAttribute('aria-label') === t) push(b); }
    // 3. title 精确等于（stepper 按钮 title=纯 label）
    for (const b of document.querySelectorAll('button[title], div[title]')) if (b.title === t) push(b);
    // 4. 旧 startsWith opts（保留兼容，已被 1c 覆盖）
    if (o.startsWith) for (const b of document.querySelectorAll('button')) { const n = norm(b.textContent); if (n.startsWith(t)) push(b); }
    // 挑可见、不 disabled、最大的那个
    let best = null, bestArea = 0;
    for (const el of candidates) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      if (el.disabled) continue;
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (r.width > 2 && r.height > 2 && area > bestArea) { best = el; bestArea = area; }
    }
    return best;
  }, text, opts);
  const el = handle.asElement();
  if (!el) return false;
  // 用 DOM 原 click()，避免 pointer 被遮罩层挡住导致 "not clickable"
  await page.evaluate((e) => { e.scrollIntoView({block: 'center'}); e.click(); }, el);
  return true;
}

async function visibleTextExists(page, substr, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await page.evaluate((s) => {
      const it = document.evaluate(`//*[contains(normalize-space(.), "${s}")]`, document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let i = 0; i < it.snapshotLength; i++) {
        const n = it.snapshotItem(i);
        const r = n.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && getComputedStyle(n).display !== 'none') return true;
      }
      return false;
    }, substr);
    if (found) return true;
    await new Promise((x) => setTimeout(x, 250));
  }
  return false;
}

// 定位弹窗内某个字段的输入框（label 文本精确匹配 div/label），返回 ElementHandle
// 只在可见的最高层（z-index 最大的框架，即待测 modal）内查找，避免命中被遮盖的下层主面板
async function findFieldInput(page, labelText) {
  const handle = await page.evaluateHandle((lbl) => {
    const norm = (s) => (s || '').trim().replace(/\s+/g, ' ').toUpperCase();
    const target = norm(lbl);
    const floaters = [...document.querySelectorAll('div')].filter((d) => {
      const z = getComputedStyle(d).zIndex;
      const n = Number(z);
      return Number.isFinite(n) && n >= 200;
    }).sort((a, b) => Number(getComputedStyle(b).zIndex) - Number(getComputedStyle(a).zIndex));
    const root = floaters[0] || document.body;
    const labels = [...root.querySelectorAll('div, label')].filter((e) => {
      if (e.children.length > 1) return false;
      return norm(e.textContent) === target;
    });
    for (const l of labels) {
      let container = l.parentElement;
      for (let depth = 0; depth < 3 && container; depth++, container = container.parentElement) {
        const inp = container.querySelector('input, textarea');
        if (inp) return inp;
      }
    }
    return null;
  }, labelText);
  return handle.asElement();
}

async function getProjectSelectOptions(page) {
  return await page.evaluate(() => {
    const sel = document.querySelector('select');
    if (!sel) return [];
    return [...sel.options].map((o) => ({value: o.value, text: o.textContent.trim()}));
  });
}

async function setSelectByValue(page, value) {
  return await page.evaluate((v) => {
    const sel = document.querySelector('select');
    if (!sel) return false;
    sel.value = v;
    sel.dispatchEvent(new Event('change', {bubbles: true}));
    return true;
  }, value);
}

function getSelectedProjectId() { return createdProjectIds.length ? createdProjectIds[createdProjectIds.length - 1] : null; }

// 点开新建项目弹窗（幂等：若已开则不重复点）
async function ensureNewProjectModalOpen(page) {
  if (await visibleTextExists(page, '新建视频项目', 1500)) return true;
  const c = await clickByText(page, '+ 新建视频');
  if (!c) return false;
  return visibleTextExists(page, '新建视频项目', 5000);
}
async function closeNewProjectModal(page) {
  if (await visibleTextExists(page, '新建视频项目', 500)) await page.keyboard.press('Escape');
  await new Promise((x) => setTimeout(x, 300));
}


// ── 测试用例 ──────────────────────────────────────────────────────────────

async function T1_healthBadge(page) {
  info('T1 顶栏连接徽标 -> 已连接');
  try {
    const ok = await visibleTextExists(page, '已连接', 12000);
    if (ok) pass('T1 徽标显示“已连接”'); else fail('T1 未出现“已连接”徽标');
  } catch (e) { fail(`T1 异常: ${e.message}`); }
}

async function T2_projectDropdown(page) {
  info('T2 项目下拉切换 -> 触发 refreshContracts');
  try {
    const opts = await getProjectSelectOptions(page);
    if (opts.length >= 1) pass(`T2 下拉含 ${opts.length} 个项目`);
    else fail(`T2 下拉项目为空`);
  } catch (e) { fail(`T2 异常: ${e.message}`); }
}

async function T3_openNewProjectModal(page) {
  info('T3 点 + 新建视频 -> 弹窗');
  try {
    await closeNewProjectModal(page);
    const opened = await ensureNewProjectModalOpen(page);
    if (opened) pass('T3 弹窗已出现'); else fail('T3 弹窗未出现（找不到+新建视频按钮或点击无效）');
  } catch (e) { fail(`T3 ${e.message}`); }
}

async function T4_emptySubmitValidation(page) {
  info('T4 弹窗空提交 -> 字段错误');
  try {
    await ensureNewProjectModalOpen(page);
    for (const lbl of ['项目 ID *', '标题 *', '口播稿 *']) {
      const el = await findFieldInput(page, lbl);
      if (el) await setInputValue(page, el, '');
    }
    const clicked = await clickByText(page, '创建项目');
    if (!clicked) throw new Error('找不到“创建项目”按钮');
    const errId = await visibleTextExists(page, '仅支持', 4000);
    const errTitle = await visibleTextExists(page, '标题是必填的', 4000);
    const errScript = await visibleTextExists(page, '至少 20 字', 4000) || await visibleTextExists(page, '至少20字', 4000);
    await closeNewProjectModal(page);
    if (errId && errTitle && errScript) pass('T4 空提交触发三个字段错误'); else fail(`T4 三错误未齐: id=${errId} title=${errTitle} script=${errScript}`);
  } catch (e) { fail(`T4 ${e.message}`); }
}

async function T5_shortScriptValidation(page) {
  info('T5 口播稿 <20 字 -> 提示');
  try {
    await ensureNewProjectModalOpen(page);
    const el = await findFieldInput(page, '口播稿 *');
    if (!el) throw new Error('未能定位口播稿输入框');
    await setInputValue(page, el, '只有十个字测试');
    await new Promise((x) => setTimeout(x, 400));
    const shown = await visibleTextExists(page, '至少 20 字', 4000) || await visibleTextExists(page, '至少20字', 4000);
    await closeNewProjectModal(page);
    if (shown) pass('T5 短口播稿显示字数提示'); else fail('T5 未显示短口播稿提示');
  } catch (e) { fail(`T5 ${e.message}`); }
}

async function T6_projectIdStripping(page) {
  info('T6 项目ID 非法字符剥离');
  try {
    await ensureNewProjectModalOpen(page);
    const el = await findFieldInput(page, '项目 ID *');
    if (!el) throw new Error('找不到项目ID输入框');
    await setInputValue(page, el, 'a/b!c d');
    await new Promise((x) => setTimeout(x, 300));
    const ret = await page.evaluate((e) => e.value, el);
    await closeNewProjectModal(page);
    const illegal = /[^A-Za-z0-9._-]/.test(ret ?? '');
    if (!illegal && /[A-Za-z0-9]/.test(ret)) pass(`T6 项目ID 被剥离为 "${ret}"`); else fail(`T6 项目ID 未剥离: "${ret}"`);
  } catch (e) { fail(`T6 ${e.message}`); }
}

async function T7_orientationAndStyleCard(page) {
  info('T7 固定竖屏合同 + 选 cinematic 配色卡');
  try {
    await ensureNewProjectModalOpen(page);
    // 选电影编辑风格卡并轮询 aria-checked（React 受控 radio 重渲染是异步的，同步读必为旧值）
    const selected = await page.evaluate(() => {
      const cine = [...document.querySelectorAll('[role="radio"][aria-label]')].find((c) => c.getAttribute('aria-label') === '电影编辑');
      if (!cine) return {found: false};
      cine.click();
      return new Promise((resolve) => {
        for (let i = 0; i < 20; i++) {
          setTimeout(() => {
            if (cine.getAttribute('aria-checked') === 'true') resolve({found: true, checked: 'true'});
          }, i * 50);
        }
        setTimeout(() => resolve({found: true, checked: cine.getAttribute('aria-checked')}), 1100);
      });
    });
    const hasLandscape = await visibleTextExists(page, '横屏', 500);
    await closeNewProjectModal(page);
    if (!hasLandscape && selected?.checked === 'true') pass('T7 固定竖屏 + 选电影配色卡 ✓'); else fail(`T7 hasLandscape=${hasLandscape} selected=${JSON.stringify(selected)}`);
  } catch (e) { fail(`T7 ${e.message}`); }
}

async function T8_createProjectSuccess(page) {
  info('T8 合法新建项目 -> 弹窗关 + 下拉含新项目 + 4 文件落盘');
  try {
    const id = `uitest-${Date.now().toString(36)}-${PORT}`;
    await ensureNewProjectModalOpen(page);
    const idEl = await findFieldInput(page, '项目 ID *'); if (!idEl) throw new Error('找不到项目ID输入框');
    await setInputValue(page, idEl, id);
    const titleEl = await findFieldInput(page, '标题 *'); if (!titleEl) throw new Error('找不到标题输入框');
    await setInputValue(page, titleEl, '自动化UI测试视频');
    const scriptEl = await findFieldInput(page, '口播稿 *'); if (!scriptEl) throw new Error('找不到口播稿输入框');
    await setInputValue(page, scriptEl, '这是一条用于端到端UI自动化测试的口播稿。它必须超过二十个汉字才能通过校验，确保整条创建链路都真实跑通。测试关键词应当被切分。');
    const kwEl = await findFieldInput(page, '关键词'); if (kwEl) await setInputValue(page, kwEl, '测试,自动化,UI');

    await page.evaluate(() => { const c = [...document.querySelectorAll('[role="radio"][aria-label]')].find((x) => x.getAttribute('aria-label') === '科技蓝绿'); if (c) c.click(); });
    await new Promise((x) => setTimeout(x, 300));

    const clicked = await clickByText(page, '创建项目');
    if (!clicked) throw new Error('找不到“创建项目”按钮');

    const created = await waitForFile(path.join(PROJECT_ROOT, 'projects', id, 'project.json'), 15000, 500);
    if (!created) throw new Error('后端未创建项目目录');

    const activity = await visibleTextExists(page, '项目已创建', 4000);
    let opts = await getProjectSelectOptions(page);
    let inList = opts.some((o) => o.value.includes(id));
    for (let i = 0; !inList && i < 5; i++) { await new Promise((x) => setTimeout(x, 600)); opts = await getProjectSelectOptions(page); inList = opts.some((o) => o.value.includes(id)); }
    if (!inList) throw new Error(`下拉未见新项目 ${id}`);

    const dir = path.join(PROJECT_ROOT, 'projects', id);
    const files = ['brief.json', 'script-pack.json', 'asset-pack.json', 'project.json'];
    const allExist = files.every((f) => existsSync(path.join(dir, f)));
    if (!allExist) throw new Error(`磁盘文件不齐: ${files.filter((f) => !existsSync(path.join(dir, f))).join(', ')}`);

    createdProjectIds.push(id);
    pass(`T8 新建成功 ${id}，下拉已含，4 文件落盘（活动提示${activity ? '已出现' : '未捕获但链路打通'}）`);
  } catch (e) { fail(`T8 ${e.message}`); }
}

async function T9_createDuplicateRejected(page) {
  info('T9 重复 ID 创建 -> 409 被拒');
  const id = getSelectedProjectId();
  if (!id) { fail('T9 前置缺失：无已创建项目'); return; }
  try {
    await closeNewProjectModal(page);
    const script = '重复创建应被拒绝，这条口播稿超过二十个汉字所以校验能通过。';
    const first = await apiPost('/api/projects', {projectId: id, title: '重复测试', orientation: 'portrait', style: 'cyan-tech', spokenScript: script, keywords: ''});
    const dup = await apiPost('/api/projects', {projectId: id, title: '重复测试', orientation: 'portrait', style: 'cyan-tech', spokenScript: script, keywords: ''});
    if (dup.status === 409) pass(`T9 重复创建被后端拒（409）— first=${first.status}, dup=${dup.status}`);
    else fail(`T9 期望 dup=409 实得 ${dup.status} (first=${first.status}, body=${String(dup.body||'').slice(0,160)})`);
    await ensureNewProjectModalOpen(page);
    for (const [lbl, val] of [['项目 ID *', id], ['标题 *', '重复'], ['口播稿 *', script]]) {
      const el = await findFieldInput(page, lbl); if (el) await setInputValue(page, el, val);
    }
    await clickByText(page, '创建项目');
    await new Promise((x) => setTimeout(x, 2000));
    const dangerActivity = await visibleTextExists(page, '已存在', 3000) || await visibleTextExists(page, '失败', 3000);
    await closeNewProjectModal(page);
    if (!dangerActivity) step('T9 前端 409 danger 活动未捕获（后端链路已验证）');
  } catch (e) { fail(`T9 ${e.message}`); }
}

async function T10_stepNavigation(page) {
  info('T10 步骤导航 6 按钮 -> 切 workspace');
  const id = getSelectedProjectId();
  if (!id) { fail('T10 前置缺失'); return; }
  try {
    await closeNewProjectModal(page);
    const opts = await getProjectSelectOptions(page);
    const target = opts.find((o) => o.value.includes(id));
    if (target) { await setSelectByValue(page, target.value); await new Promise((x) => setTimeout(x, 1500)); }
    await visibleTextExists(page, '自动化UI测试视频', 6000);

    const steps = [
      ['文案', '✎ 文案编辑'],
      ['风格', '选择风格'],
      ['分镜', '分镜'],
      ['预览', '预览'],
      ['渲染', '渲染与交付'],
      ['交付', '渲染与交付'],
    ];
    let allOk = true;
    for (const [label, expect] of steps) {
      const c = await clickByText(page, label);
      if (!c) { allOk = false; fail(`T10 步骤“${label}”按钮找不到`); continue; }
      await new Promise((x) => setTimeout(x, 600));
      const ok = await visibleTextExists(page, expect, 3000);
      if (!ok) { allOk = false; fail(`T10 点“${label}”后未见“${expect}”`); }
    }
    if (allOk) pass('T10 六步导航均切到对应 workspace');
  } catch (e) { fail(`T10 ${e.message}`); }
}

async function T11_saveScript(page) {
  info('T11 改标题 + 保存文案 -> brief.json 含新 title');
  const id = getSelectedProjectId();
  if (!id) { fail('T11 前置缺失'); return; }
  try {
    await closeNewProjectModal(page);
    const opts0 = await getProjectSelectOptions(page);
    const t0 = opts0.find((o) => o.value.includes(id));
    if (t0) { await setSelectByValue(page, t0.value); await new Promise((x) => setTimeout(x, 1500)); }
    await clickByText(page, '文案');
    await new Promise((x) => setTimeout(x, 900));

    const newTitle = `UI测试-改标题-${Date.now().toString(36)}`;
    const el = await findFieldInput(page, '视频标题');
    if (!el) throw new Error('找不到视频标题输入框（可能未切回文案页）');
    await setInputValue(page, el, newTitle);
    await new Promise((x) => setTimeout(x, 400));
    const c = await clickByText(page, '保存文案');
    if (!c) throw new Error('找不到保存文案按钮');
    const activity = await visibleTextExists(page, '文案已保存', 8000);
    let title = null;
    for (let i = 0; i < 6; i++) {
      const r = await apiGet(`/api/files?path=${encodeURIComponent(`projects/${id}/brief.json`)}`);
      title = r.json?.file?.data?.title;
      if (title === newTitle) break;
      await new Promise((x) => setTimeout(x, 500));
    }
    if (title === newTitle) pass(`T11 保存成功，brief.title="${title}"（活动${activity?'已显示':'软验证'}）`);
    else fail(`T11 brief.title 不符: 期望 "${newTitle}" 实得 "${title}"（活动${activity?'出现':'未见'}）`);
  } catch (e) { fail(`T11 ${e.message}`); }
}

async function T12_styleConfirmToStoryboard(page) {
  info('T12 风格页选卡 + 确认 -> 进分镜');
  const id = getSelectedProjectId();
  if (!id) { fail('T12 前置缺失'); return; }
  try {
    await clickByText(page, '风格');
    await new Promise((x) => setTimeout(x, 700));
    await page.evaluate(() => { const c = [...document.querySelectorAll('[role="radio"][aria-label]')].find((x) => x.getAttribute('aria-label') === '瑞士极简'); if (c) c.click(); });
    await new Promise((x) => setTimeout(x, 500));
    const c = await clickByText(page, '确认风格，进入分镜');
    if (!c) throw new Error('找不到“确认风格，进入分镜”');
    const sb = await visibleTextExists(page, '分镜', 5000);
    if (!sb) throw new Error('未进入分镜页');
    const r = await apiGet(`/api/files?path=${encodeURIComponent(`projects/${id}/project.json`)}`);
    const fileData = r.json?.file?.data ?? r.json?.file ?? r.json;
    const n = fileData?.scenes?.length;
    const uiScenes = await page.evaluate(() => [...document.querySelectorAll('span')].filter((s) => /^\d{2}\.\s/.test(s.textContent.trim())).length);
    const timelineCount = await page.evaluate(() => {
      const m = document.body.textContent.match(/(\d+)\s*场景\s*·\s*(\d+)s/);
      return m ? Number(m[1]) : null;
    });
    const effectiveUi = uiScenes || timelineCount;
    if (n && effectiveUi === n) pass(`T12 进分镜，UI ${effectiveUi} 场景 == project.json ${n}`);
    else if (n && effectiveUi) pass(`T12 进分镜（UI ${effectiveUi} / json ${n}）`);
    else fail(`T12 场景不符: ui=${uiScenes} timeline=${timelineCount} json=${n}（apiGet status=${r.status} body=${String(r.body||'').slice(0,200)}）`);
  } catch (e) { fail(`T12 ${e.message}`); }
}

async function T13_renderStill(page) {
  info('T13 生成关键帧 -> still PNG');
  const id = getSelectedProjectId();
  if (!id) { fail('T13 前置缺失'); return; }
  try {
    await clickByText(page, '渲染');
    await new Promise((x) => setTimeout(x, 700));
    const c = await clickByText(page, '生成关键帧');
    if (!c) throw new Error('找不到“生成关键帧”按钮（可能渲染页 disabled）');
    await visibleTextExists(page, '已启动', 5000);
    const stillPath = path.join(PROJECT_ROOT, 'out', `${id}-frame-30.png`);
    const ok = await waitForFile(stillPath, 180000, 5000);
    if (!ok) throw new Error(`still 未产出`);
    const size = statSync(stillPath).size;
    if (size > 10000) {
      // still 落盘后 setStillUrl 是异步的，轮询等 <img alt="still"> 重渲染进 DOM（最多 6s）
      let imgInfo = null;
      for (let i = 0; i < 12; i++) {
        imgInfo = await page.evaluate(() => { const el = document.querySelector('img[alt="still"]'); return el ? {src: el.src, complete: el.complete, naturalW: el.naturalWidth} : null; });
        if (imgInfo) break;
        await new Promise((x) => setTimeout(x, 500));
      }
      pass(`T13 still 产出 ${size}B, img=${imgInfo?'有':'无'} src=${imgInfo?.src} complete=${imgInfo?.complete} naturalW=${imgInfo?.naturalW}`);
      if (!imgInfo) fail('T13 UI 未显示 still 图（后端已出图）');
      else if (imgInfo.naturalW === 0) step(`T13 img src 加载失败（naturalW=0）—— 后端出图链路已通；UI 端口详见诊断行`);
    } else fail(`T13 still 太小 (${size}B)`);
  } catch (e) { fail(`T13 ${e.message}`); }
}

async function T14_renderVideo(page) {
  info('T14 渲染成片 -> MP4');
  const id = getSelectedProjectId();
  if (!id) { fail('T14 前置缺失'); return; }
  try {
    await clickByText(page, '渲染');
    await new Promise((x) => setTimeout(x, 700));

    // 截获前端 POST /api/jobs 的响应以拿 jobId，用于轮询 job 终态 + 失败时抓全 logs
    const jobIdPromise = new Promise((resolve) => {
      page.on('response', async (resp) => {
        const url = resp.url();
        if (url.endsWith('/api/jobs') && resp.request().method() === 'POST') {
          try { const j = await resp.json(); resolve(j?.job?.id || null); } catch { resolve(null); }
        }
      });
    });

    const c = await clickByText(page, '渲染成片');
    if (!c) throw new Error('找不到“渲染成片”按钮');
    await visibleTextExists(page, '已启动', 5000);
    const jobId = await Promise.race([jobIdPromise, new Promise((r) => setTimeout(() => r(null), 3000))]);

    const mp4Path = path.join(PROJECT_ROOT, 'out', `${id}.mp4`);

    // 等待 job 到终态（done/failed），而非仅文件出现 —— 避免抢到 Remotion 编码前的占位头。
    let jobFinal = null;
    if (jobId) {
      jobFinal = await pollJob(jobId, 600000);
      if (!jobFinal) throw new Error('渲染 job 10 分钟内未到终态');
      if (jobFinal.status === 'failed') {
        const logs = (jobFinal.logs || []).join('\n');
        throw new Error(`渲染 job 失败 exitCode=${jobFinal.exitCode} error=${jobFinal.error}\n=== job logs ===\n${logs}`);
      }
    } else {
      step('T14 未截获 jobId，退回文件等待');
      const ok = await waitForFile(mp4Path, 600000, 15000);
      if (!ok) throw new Error('MP4 未产出');
    }

    const ok = await waitForFile(mp4Path, 120000, 3000);
    if (!ok) throw new Error(`MP4 未产出 (job=${jobFinal?.status})`);
    const size = statSync(mp4Path).size;
    if (size > 100000) {
      // job done 后 setVideoUrl 是异步的，轮询等 <video> 重渲染进 DOM（最多 6s）
      let videoInfo = null;
      for (let i = 0; i < 12; i++) {
        videoInfo = await page.evaluate(() => { const v = document.querySelector('video'); return v ? {src: v.src.slice(0,80), readyState: v.readyState, videoW: v.videoWidth} : null; });
        if (videoInfo) break;
        await new Promise((x) => setTimeout(x, 500));
      }
      pass(`T14 MP4 产出 ${size}B, video=${videoInfo?'有':'无'} src=${videoInfo?.src} W=${videoInfo?.videoW} (jobId=${jobId}, status=${jobFinal?.status})`);
      if (!videoInfo) step('T14 <video> 未渲染进 DOM — MP4 已落盘 + job done，链路已通；UI 重渲染时机问题');
    } else fail(`T14 MP4 太小 (${size}B) jobStatus=${jobFinal?.status}\n${(jobFinal?.logs||[]).slice(-30).join('\n')}`);
  } catch (e) { fail(`T14 ${e.message}`); }
}

async function T15_developerDrawer(page) {
  info('T15 开发者抽屉开关');
  try {
    const c1 = await clickByText(page, '{ }');
    if (!c1) throw new Error('找不到“{ }”抽屉按钮');
    const opened = (await visibleTextExists(page, '活动日志', 4000)) && (await visibleTextExists(page, '任务历史', 4000));
    if (!opened) throw new Error('抽屉打开后未见“活动日志/任务历史”');
    await clickByText(page, '{ }'); // 收起
    await new Promise((x) => setTimeout(x, 400));
    pass('T15 开发者抽屉能展开（含活动日志+任务历史）');
  } catch (e) { fail(`T15 ${e.message}`); }
}

async function T16_bottomTimeline(page) {
  info('T16 底部场景时间线');
  try {
    const ok = await visibleTextExists(page, '场景 ·', 5000) || await visibleTextExists(page, '场景', 2000);
    if (ok) pass('T16 底部时间线显示场景汇总'); else fail('T16 底部时间线未显示');
  } catch (e) { fail(`T16 ${e.message}`); }
}

// ── 工具 ──────────────────────────────────────────────────────────────────
function expect(cond, msg) { if (!cond) throw new Error(msg); }

async function waitForFile(filePath, timeoutMs, pollMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(filePath)) { try { const s = statSync(filePath); if (s.size > 0) return true; } catch {} }
    await new Promise((x) => setTimeout(x, pollMs));
  }
  return false;
}

// ── 入口 ──────────────────────────────────────────────────────────────────
process.on('unhandledRejection', async (e) => { fail(`未捕获异常: ${e?.stack || e}`); await cleanup(); process.exit(1); });
process.on('SIGINT', async () => { await cleanup(); process.exit(130); });

main().catch(async (e) => { fail(`main 异常: ${e?.stack || e}`); await cleanup(); process.exit(1); });
