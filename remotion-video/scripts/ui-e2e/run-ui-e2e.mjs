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
    env: {...process.env, VIDEO_FACTORY_PORT: String(port), VIDEO_FACTORY_RUNTIME_DIR: runtimeRel, VIDEO_FACTORY_SKIP_TTS: '1'},
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

const clickProductionStepWhenEnabled = async (page, label, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const clicked = await page.evaluate((expected) => {
      const buttons = [...document.querySelectorAll('.production-nav__list .production-step')];
      const button = buttons.find((item) => item.querySelector('.production-step__label')?.textContent.trim() === expected);
      if (!button || button.disabled) return false;
      button.click();
      return true;
    }, label);
    if (clicked) return true;
    await delay(250);
  }
  return false;
};

const waitButtonState = async (page, text, {enabled, timeoutMs = 30000}) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const matched = await page.evaluate(({label, shouldBeEnabled}) => {
      const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ');
      const button = [...document.querySelectorAll('button')].find((item) => normalize(item.textContent) === label);
      if (!button) return false;
      const rect = button.getBoundingClientRect();
      return rect.width > 2 && rect.height > 2 && button.disabled === !shouldBeEnabled;
    }, {label: text, shouldBeEnabled: enabled});
    if (matched) return true;
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

const waitForJobFromClick = async (page, buttonText, timeoutMs = 180000, expectedCommandId = null) => {
  const responsePromise = page.waitForResponse((response) => (
    response.url().endsWith('/api/jobs') && response.request().method() === 'POST'
    && (!expectedCommandId || (() => {
      try { return JSON.parse(response.request().postData() || '{}').commandId === expectedCommandId; }
      catch { return false; }
    })())
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
  assert(job.status === 'done', 'job failed: ' + JSON.stringify({error: job.error, diagnostics: job.diagnostics, logs: job.logs?.slice(-12)}));
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

  await run('T1 direct studio entry', async () => {
    assert(await waitText(page, 'Video Factory'), 'product title missing');
    assert(await waitText(page, '执行器在线', 12000), 'runner badge missing');
  });

  await run('T2 studio shell contract', async () => {
    assert(await page.$('select[aria-label="当前项目"]'), 'project selector missing');
    assert(await page.$('.production-nav[aria-label="视频生产流程"]'), 'production navigation missing');
    assert(await page.$('.studio-workspace'), 'studio workspace missing');
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
      labels: [...document.querySelectorAll('.production-nav__list .production-step__label')].map((item) => item.textContent.trim()),
      reasons: [...document.querySelectorAll('.production-nav__list .production-step:disabled .production-step__state')].map((item) => item.textContent.trim()),
    }));
    assert(state.labels.length === 7, 'expected seven navigation nodes');
    assert(state.labels.join(',') === '文案制作,口播文案,语音,风格,分镜,渲染,交付', 'navigation order mismatch');
    assert(state.reasons.length > 0 && state.reasons.every(Boolean), 'disabled reasons missing');
  });

  await run('T7 save spoken script', async () => {
    assert(await clickProductionStepWhenEnabled(page, '口播文案'), 'script navigation missing');
    assert(await waitWorkspaceHeading(page, '口播文案'), 'script workspace missing');
    assert(await waitButtonState(page, '口播稿已保存', {enabled: false}), 'script workspace did not settle');
    const titleSelector = await findFieldSelector(page, '视频标题');
    const scriptSelector = await findFieldSelector(page, '口播稿');
    assert(titleSelector && scriptSelector, 'script fields missing');
    const updatedScript = '冷启动分镜刷新验证：这一版口播必须替换旧内容。第一段说明新项目已经选中。第二段强调保存后要重新生成字幕。第三段要求分镜标题和画面信息都来自这段新稿。';
    await setValue(page, titleSelector, 'UI 测试更新后的标题');
    await setValue(page, scriptSelector, updatedScript);
    assert(await waitButtonState(page, '保存口播稿', {enabled: true}), 'script change did not become saveable');
    assert(await clickByText(page, '保存口播稿'), 'save script button missing');
    assert(await waitButtonState(page, '口播稿已保存', {enabled: false, timeoutMs: 15000}), 'script did not settle after save');
    const scriptPack = (await apiGet('/api/files?path=' + encodeURIComponent('projects/' + projectId + '/script-pack.json'))).json?.file?.data;
    assert(scriptPack?.spokenScript === updatedScript, 'updated spoken script was not persisted');
    await page.reload({waitUntil: 'networkidle0'});
    assert(await waitText(page, '执行器在线', 12000), 'runner badge after reload missing');
    const selectedAfterReload = await page.$eval('select[aria-label="当前项目"]', (select) => select.value);
    assert(selectedAfterReload.includes('/' + projectId + '/'), 'last selected project was not restored after reload');
  });

  await run('T8 voice synthesis gate', async () => {
    assert(await clickProductionStepWhenEnabled(page, '语音'), 'voice navigation did not unlock');
    assert(await waitWorkspaceHeading(page, '语音'), 'voice workspace missing');
    await waitForJobFromClick(page, '合成语音', 240000, 'build-check');
    assert(await waitText(page, '已有音轨', 30000), 'voice asset did not become ready');
    const assetPack = (await apiGet('/api/files?path=' + encodeURIComponent('projects/' + projectId + '/asset-pack.json'))).json?.file?.data;
    assert(assetPack?.assets?.some((asset) => asset.id === 'voiceover' && asset.kind === 'audio'), 'voiceover asset was not persisted');
    const project = (await apiGet('/api/files?path=' + encodeURIComponent('projects/' + projectId + '/project.json'))).json?.file?.data;
    assert(project?.title === 'UI 测试更新后的标题', 'project title did not update from script workspace');
    assert(project?.captions?.some((caption) => caption.text.includes('冷启动分镜刷新验证')), 'project captions still use old script');
    assert(project?.scenes?.some((scene) => String(scene.payload?.sourceText || scene.payload?.body || '').includes('分镜标题和画面信息')), 'storyboard scenes still use old script');
    assert(Array.isArray(project?.scenes) && project.scenes.length > 0, 'project scenes missing');
  });

  await run('T9 style candidate and explicit save', async () => {
    assert(await clickProductionStepWhenEnabled(page, '风格'), 'style navigation did not unlock');
    assert(await waitWorkspaceHeading(page, '风格'), 'style workspace missing');
    const samples = await page.$$('.style-option');
    assert(samples.length === 4, 'expected four style options');
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
    let selectedLabel = '';
    for (let attempt = 0; attempt < 12; attempt += 1) {
      selectedLabel = await page.evaluate(() => document.querySelector('[role="radio"][aria-checked="true"]')?.getAttribute('aria-label') || '');
      if (selectedLabel.includes('瑞士极简')) break;
      await delay(250);
    }
    assert(selectedLabel.includes('瑞士极简'), 'style selection did not settle: ' + selectedLabel);
    assert(await waitButtonState(page, '保存风格', {enabled: true}), 'save style button missing');
    assert(await clickByText(page, '保存风格'), 'save style click failed');
    assert(await waitButtonState(page, '先选择一个风格', {enabled: false, timeoutMs: 15000}), 'style did not settle after save');
    assert(await clickProductionStepWhenEnabled(page, '分镜'), 'storyboard navigation did not unlock');
    assert(await waitWorkspaceHeading(page, '当前分镜'), 'storyboard workspace missing');
  });

  await run('T10 scene timeline labels', async () => {
    const text = await page.$eval('.scene-timeline', (element) => element.innerText);
    assert(!text.includes('Cinematic') && !text.includes('Hero Track'), 'renderer names leaked into timeline');
    assert((await page.$$('.timeline-scene')).length > 0, 'timeline scenes missing');
    const firstScene = await page.$('.timeline-scene');
    assert(firstScene, 'timeline scene missing');
    await firstScene.click();
    await delay(300);
    const selectedState = await page.evaluate(() => ({
      heading: document.querySelector('.studio-workspace .workspace-heading h1')?.textContent.trim() || '',
      summary: document.querySelector('.scene-edit__summary')?.textContent || '',
      timelineDetail: document.querySelector('.timeline-detail')?.textContent || '',
    }));
    assert(selectedState.heading === '当前分镜', 'timeline selection left storyboard workspace');
    assert(selectedState.summary.includes('01 /'), 'selected storyboard summary missing');
    assert(selectedState.timelineDetail.includes('01 /'), 'selected scene did not sync to timeline detail');
  });

  await run('T10b component library separates production renderers from preview-only assets', async () => {
    const library = await apiGet('/api/component-library');
    assert(library.status === 200 && library.json?.available, 'component library unavailable');
    const productionComponents = library.json.components.filter((component) => component.source === 'project');
    const hyperframesComponents = library.json.components.filter((component) => component.source === 'hyperframes');
    assert(productionComponents.length >= 12, 'production component descriptors were not loaded');
    assert(productionComponents.every((component) => component.productionReady === true && component.renderer?.componentId), 'production components were not exposed as renderers');
    assert(hyperframesComponents.every((component) => component.productionReady === false && component.renderer === null), 'HyperFrames preview was exposed as productionReady');
    assert(await clickByText(page, '组件库'), 'component library navigation missing');
    assert(await waitWorkspaceHeading(page, '组件库'), 'component library workspace missing');
    if (hyperframesComponents.length > 0) {
      const previewCandidate = hyperframesComponents[0];
      assert(await clickByText(page, '全量'), 'full component scope missing');
      assert(await clickByText(page, previewCandidate.orientation === 'landscape' ? '横屏' : '竖屏'), 'preview component orientation filter missing');
      assert(await clickByText(page, previewCandidate.category), 'preview component category filter missing');
      const selectedRemote = await page.evaluate((sourceId) => {
        const tile = [...document.querySelectorAll('.component-result')].find((item) =>
          item.textContent.includes('HyperFrames') && item.textContent.includes(sourceId)
        );
        if (!tile) return false;
        tile.click();
        return true;
      }, previewCandidate.label);
      assert(selectedRemote, 'no HyperFrames preview component found');
      const applyState = await page.$eval('.component-applybar__action', (button) => ({disabled: button.disabled, text: button.textContent.trim()}));
      assert(applyState.disabled && applyState.text === '仅供候选预览', 'preview-only component could be applied to production');
    }
    const saved = (await apiGet('/api/files?path=' + encodeURIComponent('projects/' + projectId + '/project.json'))).json?.file?.data;
    assert(!saved?.scenes?.some((scene) => scene.assetIds?.some((id) => String(id).startsWith('hyperframes-'))), 'preview asset leaked into production project');
  });

  await run('T11 disabled legacy preview and current scene still', async () => {
    const hasPreviewStep = await page.evaluate(() => [...document.querySelectorAll('.production-nav__list .production-step__label')].some((item) => item.textContent.trim() === '预览'));
    assert(!hasPreviewStep, 'legacy preview step leaked into production navigation');
    assert(await clickProductionStepWhenEnabled(page, '分镜', 240000), 'storyboard navigation did not unlock');
    assert(await waitWorkspaceHeading(page, '当前分镜'), 'storyboard workspace missing');
    await waitForJobFromClick(page, '渲染关键帧', 240000, 'project-scene-stills');
    const manifest = path.join(projectRoot, 'out', projectId + '-scene-stills', 'manifest.json');
    const firstStill = path.join(projectRoot, 'out', projectId + '-scene-stills', 'scene-01.png');
    assert(await waitForFile(manifest, 120000), 'scene still manifest missing');
    assert(await waitForFile(firstStill, 120000), 'scene still image missing');
    assert(statSync(firstStill).size > 10000, 'scene still image too small');
    await page.waitForSelector('.storyboard-frame img', {visible: true, timeout: 30000});
    const previewText = await page.$eval('.studio-preview', (element) => element.innerText);
    assert(!/VOICE HIT|VOICE \/ VISUAL|FOCUS \/|HERO TRACK|CINEMATIC SHOT|FRAME-LOCKED/i.test(previewText), 'internal renderer labels leaked into preview');
    await page.waitForSelector('.studio-interaction-lock', {hidden: true, timeout: 240000});
  });

  if (!skipRender) {
    await run('T12 render, library record and download gate', async () => {
      assert(await clickProductionStepWhenEnabled(page, '渲染', 240000), 'render navigation did not unlock');
      assert(await waitWorkspaceHeading(page, '渲染'), 'render workspace missing');
      const job = await waitForJobFromClick(page, '生成最终视频', 600000, 'render-verify');
      const video = path.join(projectRoot, 'out', projectId + '.mp4');
      assert(await waitForFile(video, 120000) && statSync(video).size > 100000, 'video output missing');
      await page.waitForSelector('.runner-trace', {visible: true, timeout: 30000});
      const renderUi = await page.evaluate(() => ({
        trace: document.querySelector('.runner-trace')?.textContent || '',
        workspaceVideos: document.querySelectorAll('.studio-workspace .artifact-video').length,
      }));
      assert(renderUi.trace.includes('验收视频文件'), 'render runner trace missing execution detail');
      assert(!renderUi.trace.includes('代码同步'), 'developer command log leaked into production progress');
      assert(renderUi.workspaceVideos === 0, 'render workspace should not duplicate the video player');
      await page.waitForSelector('.studio-preview .preview-video-player', {visible: true, timeout: 30000});
      const library = await apiGet('/api/video-library');
      const record = library.json?.records?.find((item) => item.sourceJobId === job.id);
      assert(record?.status === 'downloadable' && record.downloadAllowed, 'downloadable library record missing');
      const download = await apiGet(record.downloadUrl);
      assert(download.status === 200, 'protected download rejected');
    });
  } else {
    pass('T12 render skipped by SKIP_RENDER');
  }

  await run('T13 video library screen', async () => {
    assert(await clickByText(page, '视频库'), 'library button missing');
    await page.waitForSelector('.library-screen', {visible: true, timeout: 10000});
    if (skipRender) assert(await waitText(page, '还没有成片'), 'empty library state missing');
    else {
      await page.waitForSelector('.library-player', {visible: true, timeout: 30000});
      assert(await waitText(page, '已生成，可下载'), 'download status missing');
    }
  });

  await run('T14 mobile overflow', async () => {
    await page.setViewport({width: 390, height: 844});
    await delay(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, 'horizontal overflow: ' + overflow);
  });

  await run('T15 runtime errors', async () => {
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
