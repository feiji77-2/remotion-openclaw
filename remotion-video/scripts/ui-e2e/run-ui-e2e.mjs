import {spawn, spawnSync} from 'node:child_process';
import {existsSync, statSync} from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..', '..');
const buildDir = path.join(projectRoot, 'build', 'tools');
const headful = Boolean(process.env.HEADFUL);
const skipRender = Boolean(process.env.SKIP_RENDER);
const port = 8787 + Math.floor(Math.random() * 4000);
const runtimeRel = 'runtime/ui-e2e-' + port;
let browser = null;
let server = null;
let projectId = null;
const results = {pass: 0, fail: 0, failures: []};

const info = (message) => console.log('--- ' + message);
const pass = (message) => { results.pass += 1; console.log('PASS ' + message); };
const fail = (message) => { results.fail += 1; results.failures.push(message); console.error('FAIL ' + message); };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const request = (method, pathname, payload = null) => new Promise((resolve, reject) => {
  const body = payload == null ? null : JSON.stringify(payload);
  const req = http.request('http://127.0.0.1:' + port + pathname, {
    method,
    headers: body ? {'content-type': 'application/json', 'content-length': Buffer.byteLength(body)} : {},
  }, (res) => {
    let text = '';
    res.on('data', (chunk) => { text += chunk; });
    res.on('end', () => {
      try { resolve({status: res.statusCode, json: JSON.parse(text), body: text}); }
      catch { resolve({status: res.statusCode, json: null, body: text}); }
    });
  });
  req.on('error', reject);
  if (body) req.write(body);
  req.end();
});

const apiGet = (pathname) => request('GET', pathname);
const pollJob = async (id, timeoutMs = 180000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await apiGet('/api/jobs/' + encodeURIComponent(id));
    if (response.json?.job?.status !== 'running') return response.json?.job ?? null;
    await delay(750);
  }
  return null;
};

const waitForFile = async (file, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(file) && statSync(file).size > 0) return true;
    await delay(500);
  }
  return false;
};

const startServer = async () => {
  server = spawn('node', [path.join(projectRoot, 'scripts', 'tools-studio-server.mjs')], {
    cwd: projectRoot,
    env: {...process.env, VIDEO_FACTORY_PORT: String(port), VIDEO_FACTORY_RUNTIME_DIR: runtimeRel},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => console.log(String(chunk).trim()));
  server.stderr.on('data', (chunk) => console.error(String(chunk).trim()));
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try { if ((await apiGet('/api/health')).status === 200) return; } catch {}
    await delay(300);
  }
  throw new Error('server start timeout');
};

const cleanup = async () => {
  if (browser) await browser.close().catch(() => undefined);
  if (server) server.kill('SIGTERM');
  if (projectId) {
    await fs.rm(path.join(projectRoot, 'projects', projectId), {recursive: true, force: true});
    await fs.rm(path.join(projectRoot, 'public', 'projects', projectId), {recursive: true, force: true});
    await fs.rm(path.join(projectRoot, 'out', projectId + '-frame-30.png'), {force: true});
    await fs.rm(path.join(projectRoot, 'out', projectId + '-scene-stills'), {recursive: true, force: true});
    await fs.rm(path.join(projectRoot, 'out', projectId + '.mp4'), {force: true});
  }
  await fs.rm(path.join(projectRoot, runtimeRel), {recursive: true, force: true});
};

const run = async (name, task) => {
  info(name);
  try { await task(); pass(name); } catch (error) { fail(name + ': ' + error.message); }
};

const clickByText = async (page, text) => page.evaluate((label) => {
  const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ');
  const candidates = [...document.querySelectorAll('button, a')].filter((element) => {
    const value = normalize(element.textContent);
    return value === label || value.includes(label);
  });
  const target = candidates.find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2 && !element.disabled && getComputedStyle(element).visibility !== 'hidden';
  });
  if (!target) return false;
  target.click();
  return true;
}, text);

const waitText = async (page, text, timeoutMs = 8000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const visible = await page.evaluate((needle) => document.body.innerText.includes(needle), text);
    if (visible) return true;
    await delay(200);
  }
  return false;
};

const clickWhenEnabled = async (page, text, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await clickByText(page, text)) return true;
    await delay(250);
  }
  return false;
};

const waitWorkspaceHeading = async (page, expected, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const heading = await page.evaluate(() => document.querySelector('.studio-workspace .workspace-heading h1')?.textContent.trim() || '');
    if (heading === expected) return true;
    await delay(250);
  }
  return false;
};

const setValue = async (page, selector, value) => {
  await page.$eval(selector, (element, next) => {
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, next);
    element.dispatchEvent(new Event('input', {bubbles: true}));
  }, value);
};

const findFieldSelector = async (page, labelText) => page.evaluate((needle) => {
  const labels = [...document.querySelectorAll('label.form-field')];
  const label = labels.find((item) => item.textContent.includes(needle));
  if (!label) return null;
  const input = label.querySelector('input, textarea');
  if (!input) return null;
  const key = needle.includes('口播') ? 'spoken-script' : needle.includes('标题') ? 'video-title' : 'field';
  input.dataset.e2eField = key;
  return '[data-e2e-field="' + key + '"]';
}, labelText);

const waitForJobFromClick = async (page, buttonText, timeoutMs = 180000) => {
  const responsePromise = page.waitForResponse((response) => (
    response.url().endsWith('/api/jobs') && response.request().method() === 'POST'
  ), {timeout: 45000});
  const clicked = await clickWhenEnabled(page, buttonText);
  if (!clicked) {
    void responsePromise.catch(() => undefined);
    throw new Error('button not found: ' + buttonText);
  }
  const response = await responsePromise;
  const payload = await response.json();
  assert(payload?.job?.id, 'job response missing id');
  const job = await pollJob(payload.job.id, timeoutMs);
  assert(job, 'job timeout: ' + payload.job.id);
  assert(job.status === 'done', 'job failed: ' + (job.error || job.id));
  return job;
};

const main = async () => {
  if (!existsSync(path.join(buildDir, 'index.html'))) {
    const built = spawnSync('npm', ['run', 'tools:build'], {cwd: projectRoot, stdio: 'inherit'});
    assert(built.status === 0, 'tools build failed');
  }
  await startServer();
  const puppeteer = (await import('puppeteer')).default;
  browser = await puppeteer.launch({headless: headful ? false : 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']});
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  await page.setViewport({width: 1440, height: 900});
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(message.text()); });
  await page.goto('http://127.0.0.1:' + port + '/', {waitUntil: 'networkidle0'});

  await run('T1 default home', async () => {
    assert(await waitText(page, '开始生产'), 'home title missing');
    assert(await waitText(page, '最近生成视频'), 'recent outputs missing');
  });

  await run('T2 enter studio', async () => {
    assert(await clickByText(page, '打开工作台'), 'open studio button missing');
    assert(await waitText(page, '执行器在线', 12000), 'runner badge missing');
    assert(await page.$('select[aria-label="当前项目"]'), 'project selector missing');
  });

  await run('T3 new project modal contract', async () => {
    assert(await clickByText(page, '+ 新建视频'), 'new project button missing');
    await page.waitForSelector('.project-modal', {visible: true});
    const contract = await page.evaluate(() => ({
      hasProjectId: document.querySelector('.project-modal').innerText.includes('项目 ID'),
      hasStyle: document.querySelectorAll('.project-modal [role="radio"]').length > 0,
      focused: document.activeElement?.tagName,
      optionalTitle: [...document.querySelectorAll('.project-modal label')].some((label) => label.textContent.includes('视频标题') && label.textContent.includes('可选')),
    }));
    assert(!contract.hasProjectId && !contract.hasStyle, 'technical fields leaked into modal');
    assert(contract.focused === 'TEXTAREA' && contract.optionalTitle, 'spoken script is not primary');
  });

  await run('T4 short script validation', async () => {
    const scriptSelector = await findFieldSelector(page, '口播文案');
    assert(scriptSelector, 'spoken script field missing');
    await setValue(page, scriptSelector, '太短');
    assert(await clickByText(page, '创建并进入口播文案'), 'create button missing');
    assert(await waitText(page, '至少输入 20 个字'), 'short script error missing');
  });

  await run('T5 create project with automatic id', async () => {
    const titleSelector = await findFieldSelector(page, '视频标题');
    const scriptSelector = await findFieldSelector(page, '口播文案');
    assert(titleSelector && scriptSelector, 'create fields missing');
    await setValue(page, titleSelector, '自动化 UI 测试视频');
    await setValue(page, scriptSelector, '这是一条用于端到端 UI 自动化测试的正式口播文案。它超过二十个汉字，可以真实创建项目并继续后续生产。');
    await delay(500);
    const values = await page.evaluate(() => ({
      title: document.querySelector('[data-e2e-field="video-title"]')?.value,
      script: document.querySelector('[data-e2e-field="spoken-script"]')?.value,
      disabled: document.querySelector('.project-modal__create')?.disabled,
    }));
    assert(values.title === '自动化 UI 测试视频' && values.script?.length >= 20 && !values.disabled, 'controlled fields did not settle: ' + JSON.stringify(values));
    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/projects') && response.request().method() === 'POST', {timeout: 10000});
    assert(await clickByText(page, '创建并进入口播文案'), 'create button missing');
    const response = await Promise.race([responsePromise, delay(3000).then(() => null)]);
    if (!response) {
      void responsePromise.catch(() => undefined);
      const diagnostic = await page.evaluate(() => ({
        modalError: document.querySelector('.project-modal .notice--error')?.textContent,
        issue: document.querySelector('.issue-panel')?.textContent,
      }));
      throw new Error('create request not sent: ' + JSON.stringify({diagnostic, pageErrors}));
    }
    const payload = await response.json();
    projectId = payload?.project?.id;
    assert(projectId && /^video-[a-z0-9-]+$/.test(projectId), 'unsafe automatic id');
    assert(await waitForFile(path.join(projectRoot, 'projects', projectId, 'project.json'), 15000), 'project file missing');
    assert(await waitText(page, '口播文案'), 'did not enter script workspace');
  });

  await run('T6 seven stage navigation', async () => {
    const state = await page.evaluate(() => ({
      labels: [...document.querySelectorAll('.production-step__label')].map((item) => item.textContent.trim()),
      reasons: [...document.querySelectorAll('.production-step:disabled .production-step__state')].map((item) => item.textContent.trim()),
    }));
    assert(state.labels.length === 7, 'expected seven navigation nodes');
    assert(state.labels[0] === '文案制作' && state.labels[1] === '口播文案', 'navigation order mismatch');
    assert(state.reasons.length > 0 && state.reasons.every(Boolean), 'disabled reasons missing');
  });

  await run('T7 save script and build storyboard', async () => {
    assert(await clickByText(page, '口播文案'), 'script navigation missing');
    assert(await waitWorkspaceHeading(page, '文案'), 'script workspace missing');
    assert(await waitText(page, '分镜已是最新', 30000), 'script workspace did not settle');
    const titleSelector = await findFieldSelector(page, '视频标题');
    const scriptSelector = await findFieldSelector(page, '口播稿');
    assert(titleSelector && scriptSelector, 'script fields missing');
    const updatedScript = '冷启动分镜刷新验证：这一版口播必须替换旧内容。第一段说明新项目已经选中。第二段强调保存后要重新生成字幕。第三段要求分镜标题和画面信息都来自这段新稿。';
    await setValue(page, titleSelector, 'UI 测试更新后的标题');
    await setValue(page, scriptSelector, updatedScript);
    assert(await waitText(page, '保存并更新分镜', 5000), 'script change did not become dirty');
    await waitForJobFromClick(page, '保存并更新分镜');
    assert(await waitWorkspaceHeading(page, '分镜'), 'storyboard workspace missing');
    const project = (await apiGet('/api/files?path=' + encodeURIComponent('projects/' + projectId + '/project.json'))).json?.file?.data;
    const scriptPack = (await apiGet('/api/files?path=' + encodeURIComponent('projects/' + projectId + '/script-pack.json'))).json?.file?.data;
    assert(scriptPack?.spokenScript === updatedScript, 'updated spoken script was not persisted');
    assert(project?.title === 'UI 测试更新后的标题', 'project title did not update from script workspace');
    assert(project?.captions?.some((caption) => caption.text.includes('冷启动分镜刷新验证')), 'project captions still use old script');
    assert(project?.scenes?.some((scene) => String(scene.payload?.sourceText || scene.payload?.body || '').includes('分镜标题和画面信息')), 'storyboard scenes still use old script');
    assert(Array.isArray(project?.scenes) && project.scenes.length > 0, 'project scenes missing');
    await page.reload({waitUntil: 'networkidle0'});
    assert(await clickByText(page, '打开工作台'), 'open studio after reload missing');
    assert(await waitText(page, '执行器在线', 12000), 'runner badge after reload missing');
    const selectedAfterReload = await page.$eval('select[aria-label="当前项目"]', (select) => select.value);
    assert(selectedAfterReload.includes('/' + projectId + '/'), 'last selected project was not restored after reload');
  });

  await run('T8 style sample candidate and explicit apply', async () => {
    assert(await clickWhenEnabled(page, '风格'), 'style navigation did not unlock');
    const samples = await page.$$('.style-option video');
    assert(samples.length === 4, 'expected four real style samples');
    let settled = false;
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const action = await page.evaluate(() => document.querySelector('.studio-workspace .primary-action')?.textContent.trim() || '');
      if (action && !action.includes('正在')) { settled = true; break; }
      await delay(250);
    }
    assert(settled, 'style workspace did not settle');
    await page.evaluate(() => {
      const option = [...document.querySelectorAll('[role="radio"]')].find((item) => item.getAttribute('aria-label')?.includes('瑞士极简'));
      option?.click();
    });
    let playback = {selected: 0, playing: 0};
    for (let attempt = 0; attempt < 12; attempt += 1) {
      playback = await page.evaluate(() => ({
        selected: document.querySelectorAll('[role="radio"][aria-checked="true"]').length,
        playing: [...document.querySelectorAll('.style-option video')].filter((video) => !video.paused).length,
      }));
      if (playback.selected === 1 && playback.playing <= 1) break;
      await delay(250);
    }
    assert(playback.selected === 1 && playback.playing <= 1, 'style sample selection is not exclusive: ' + JSON.stringify(playback));
    await waitForJobFromClick(page, '应用候选风格');
    assert(await waitWorkspaceHeading(page, '分镜'), 'style refresh did not return to storyboard');
  });

  await run('T9 scene timeline labels', async () => {
    const text = await page.$eval('.scene-timeline', (element) => element.innerText);
    assert(!text.includes('Cinematic') && !text.includes('Hero Track'), 'renderer names leaked into timeline');
    assert((await page.$$('.timeline-scene')).length > 0, 'timeline scenes missing');
    const firstCard = await page.$('.storyboard-card');
    assert(firstCard, 'storyboard card missing');
    await firstCard.click();
    await delay(300);
    const selectedState = await page.evaluate(() => ({
      heading: document.querySelector('.studio-workspace .workspace-heading h1')?.textContent.trim() || '',
      hasBack: document.body.innerText.includes('返回分镜'),
      selectedFacts: document.querySelector('.storyboard-card.is-selected .storyboard-card__facts')?.textContent || '',
      timelineDetail: document.querySelector('.timeline-detail')?.textContent || '',
    }));
    assert(selectedState.heading === '分镜' && !selectedState.hasBack, 'storyboard card opened a detail page');
    assert(selectedState.selectedFacts.includes('时长'), 'selected storyboard facts missing');
    assert(selectedState.timelineDetail.includes('01 /'), 'selected scene did not sync to timeline detail');
  });

  await run('T10 current preview gate and still', async () => {
    assert(await clickWhenEnabled(page, '预览'), 'preview navigation did not unlock');
    assert(await waitWorkspaceHeading(page, '预览'), 'preview workspace missing');
    await waitForJobFromClick(page, '生成分镜画面', 240000);
    const manifest = path.join(projectRoot, 'out', projectId + '-scene-stills', 'manifest.json');
    const firstStill = path.join(projectRoot, 'out', projectId + '-scene-stills', 'scene-01.png');
    assert(await waitForFile(manifest, 120000), 'scene still manifest missing');
    assert(await waitForFile(firstStill, 120000), 'scene still image missing');
    assert(statSync(firstStill).size > 10000, 'scene still image too small');
    await page.waitForSelector('.scene-preview-tile img', {visible: true, timeout: 30000});
    assert((await page.$$('.scene-preview-tile')).length > 0, 'scene preview tiles missing');
    await page.waitForSelector('.portrait-frame', {visible: true, timeout: 10000});
    const previewText = await page.$eval('.studio-preview', (element) => element.innerText);
    assert(!/VOICE HIT|VOICE \/ VISUAL|FOCUS \/|HERO TRACK|CINEMATIC SHOT|FRAME-LOCKED/i.test(previewText), 'internal renderer labels leaked into preview');
  });

  if (!skipRender) {
    await run('T11 render, library record and download gate', async () => {
      assert(await clickByText(page, '渲染'), 'render navigation missing');
      const job = await waitForJobFromClick(page, '生成最终视频', 600000);
      const video = path.join(projectRoot, 'out', projectId + '.mp4');
      assert(await waitForFile(video, 120000) && statSync(video).size > 100000, 'video output missing');
      await page.waitForSelector('.runner-trace', {visible: true, timeout: 30000});
      const renderUi = await page.evaluate(() => ({
        trace: document.querySelector('.runner-trace')?.textContent || '',
        workspaceVideos: document.querySelectorAll('.studio-workspace .artifact-video').length,
      }));
      assert(renderUi.trace.includes('代码同步') && renderUi.trace.includes('验收视频文件'), 'render runner trace missing execution detail');
      assert(renderUi.workspaceVideos === 0, 'render workspace should not duplicate the video player');
      await page.waitForSelector('.studio-preview .preview-video-player', {visible: true, timeout: 30000});
      const library = await apiGet('/api/video-library');
      const record = library.json?.records?.find((item) => item.sourceJobId === job.id);
      assert(record?.status === 'downloadable' && record.downloadAllowed, 'downloadable library record missing');
      const download = await apiGet(record.downloadUrl);
      assert(download.status === 200, 'protected download rejected');
    });
  } else {
    pass('T11 render skipped by SKIP_RENDER');
  }

  await run('T12 video library screen', async () => {
    assert(await clickByText(page, '视频库'), 'library button missing');
    await page.waitForSelector('.library-screen', {visible: true, timeout: 10000});
    if (skipRender) assert(await waitText(page, '还没有成片'), 'empty library state missing');
    else {
      await page.waitForSelector('.library-player', {visible: true, timeout: 30000});
      assert(await waitText(page, '已生成，可下载'), 'download status missing');
    }
  });

  await run('T13 mobile overflow', async () => {
    await page.setViewport({width: 390, height: 844});
    await delay(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, 'horizontal overflow: ' + overflow);
  });

  await run('T14 runtime errors', async () => {
    assert(pageErrors.length === 0, 'page errors: ' + pageErrors.join(' | '));
  });

  console.log('UI E2E: PASS ' + results.pass + ' / FAIL ' + results.fail);
  for (const failure of results.failures) console.error(' - ' + failure);
  await cleanup();
  process.exit(results.fail ? 1 : 0);
};

main().catch(async (error) => {
  console.error(error);
  await cleanup();
  process.exit(1);
});
