#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PORT=$((8787 + RANDOM % 1000))
HOST="http://127.0.0.1:$PORT"
TEST_ID="console-e2e-$(date +%H%M%S)"
TEST_DIR="$PROJECT_ROOT/projects/$TEST_ID"

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$TEST_DIR" "$PROJECT_ROOT/public/projects/$TEST_ID" "$PROJECT_ROOT/out/$TEST_ID"* "$PROJECT_ROOT/runtime/e2e-$TEST_ID" 2>/dev/null || true
}
trap cleanup EXIT

VIDEO_FACTORY_SKIP_TTS=1 VIDEO_FACTORY_PORT=$PORT VIDEO_FACTORY_RUNTIME_DIR="runtime/e2e-$TEST_ID" node "$PROJECT_ROOT/scripts/tools-studio-server.mjs" &
SERVER_PID=$!
for _ in $(seq 1 30); do
  curl -sf "$HOST/api/health" >/dev/null 2>&1 && break
  sleep 0.2
done
curl -sf "$HOST/api/health" >/dev/null
curl -sf -H 'Range: bytes=0-127' "$HOST/projects/skill-showcase/audio/voice.m4a" >/dev/null

curl -sf -X POST "$HOST/api/projects" \
  -H 'content-type: application/json' \
  -d "{\"projectId\":\"$TEST_ID\",\"title\":\"控制台主链路验证\",\"orientation\":\"portrait\",\"style\":\"cyan-tech\",\"spokenScript\":\"这是当前唯一视频生成链路的端到端测试。它必须生成 Skill Showcase 场景，并且完整覆盖字幕和技术画面。\",\"keywords\":\"主链路,Skill Showcase,测试\"}" >/dev/null

for file in brief.json script-pack.json asset-pack.json project.json; do
  test -f "$TEST_DIR/$file"
done

node --input-type=module -e '
  import fs from "node:fs";
  const project = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (project.render.width !== 1080 || project.render.height !== 1920 || project.render.orientation !== "portrait") throw new Error("portrait contract mismatch");
  if (!project.scenes.length || !project.scenes.every((scene) => scene.family === "skill-showcase" && scene.payload.heroStyle === "hero-track-v2")) throw new Error("renderer contract mismatch");
' "$TEST_DIR/project.json"

node --input-type=module - "$HOST" "$TEST_ID" "$TEST_DIR" <<'NODE'
import fs from 'node:fs';

const [base, id, testDir] = process.argv.slice(2);
const project = {
  id,
  title: '控制台主链路验证',
  productionPath: `projects/${id}`,
  projectJsonPath: `projects/${id}/project.json`,
  outputVideoPath: `out/${id}.mp4`,
};

const request = async (pathname, options = {}) => {
  const response = await fetch(`${base}${pathname}`, options);
  const payload = await response.json();
  return {status: response.status, payload};
};
const post = (pathname, body) => request(pathname, {
  method: 'POST',
  headers: {'content-type': 'application/json'},
  body: JSON.stringify(body),
});
const startJob = async (commandId, target = project) => {
  const result = await post('/api/jobs', {commandId, label: `E2E ${commandId}`, project: target});
  if (result.status !== 202 || !result.payload?.job?.id) throw new Error(`${commandId} did not start: ${JSON.stringify(result)}`);
  return result.payload.job;
};
const readContract = (file) => JSON.parse(fs.readFileSync(`${testDir}/${file}`, 'utf8'));
const pollJob = async (jobId, timeoutMs = 180000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await request(`/api/jobs/${jobId}`);
    if (result.status === 200 && result.payload.job.status !== 'running') return result.payload.job;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`job ${jobId} timed out`);
};

const componentLibrary = await request('/api/component-library');
if (componentLibrary.status !== 200 || !Array.isArray(componentLibrary.payload.components)) {
  throw new Error(`component library contract failed: ${JSON.stringify(componentLibrary)}`);
}
const productionComponents = componentLibrary.payload.components.filter((component) => component.source === 'project');
const hyperframesComponents = componentLibrary.payload.components.filter((component) => component.source === 'hyperframes');
if (productionComponents.length < 12 || !productionComponents.every((component) => component.productionReady === true && component.renderer?.componentId)) {
  throw new Error('production component descriptors were not exposed as usable renderers');
}
if (!hyperframesComponents.every((component) => component.productionReady === false && component.renderer === null)) {
  throw new Error('preview-only HyperFrames components were exposed as production renderers');
}

const prematureRender = await post('/api/jobs', {commandId: 'render-verify', label: 'premature render', project});
if (prematureRender.status !== 409 || prematureRender.payload.code !== 'project_not_checked') {
  throw new Error(`render preflight gate failed: ${JSON.stringify(prematureRender)}`);
}

const standaloneCheck = await pollJob((await startJob('project-check')).id);
if (standaloneCheck.status !== 'done') throw new Error(`standalone project-check failed: ${JSON.stringify(standaloneCheck)}`);
const renderAfterStandaloneCheck = await post('/api/jobs', {commandId: 'render-verify', label: 'still premature render', project});
if (renderAfterStandaloneCheck.status !== 409 || renderAfterStandaloneCheck.payload.code !== 'project_not_checked') {
  throw new Error(`standalone project-check unlocked render-verify: ${JSON.stringify(renderAfterStandaloneCheck)}`);
}

const missingProject = {
  ...project,
  id: `${id}-missing`,
  productionPath: `projects/${id}-missing`,
  projectJsonPath: `projects/${id}-missing/project.json`,
  outputVideoPath: `out/${id}-missing.mp4`,
};
const failedBuild = await pollJob((await startJob('build-check', missingProject)).id);
if (failedBuild.status !== 'failed' || failedBuild.steps[0].status !== 'failed' || failedBuild.steps[1].status !== 'pending') {
  throw new Error(`build-check did not stop at the failed build step: ${JSON.stringify(failedBuild)}`);
}
if (!failedBuild.diagnostics?.some((diagnostic) => diagnostic.code === 'command_failed' || diagnostic.code === 'file_missing')) {
  throw new Error(`build-check did not expose structured diagnostics: ${JSON.stringify(failedBuild)}`);
}

const built = await pollJob((await startJob('build-check')).id);
if (built.status !== 'done' || built.steps.map((step) => step.status).join(',') !== 'done,done,done,done,done') {
  throw new Error(`build-check workflow failed: ${JSON.stringify(built)}`);
}
const builtAssetPack = readContract('asset-pack.json');
const alignedCaptions = readContract('captions.json');
const builtProject = readContract('project.json');
const expectedVoiceSrc = `projects/${id}/audio/voice.m4a`;
if (!builtAssetPack.assets?.some((asset) => asset.id === 'voiceover' && asset.kind === 'audio' && asset.src === expectedVoiceSrc)) {
  throw new Error(`build-check did not register voiceover asset: ${JSON.stringify(builtAssetPack)}`);
}
if (builtProject.audio?.voiceAssetId !== 'voiceover' || builtProject.assets?.voiceover?.src !== expectedVoiceSrc) {
  throw new Error(`build-check did not rebuild project with voiceover: ${JSON.stringify({audio: builtProject.audio, assets: builtProject.assets})}`);
}
if (!alignedCaptions.length || builtProject.captions.at(-1)?.endMs !== alignedCaptions.at(-1)?.endMs) {
  throw new Error(`build-check did not rebuild project from aligned captions: ${JSON.stringify({aligned: alignedCaptions.at(-1), project: builtProject.captions?.at(-1)})}`);
}
if (!builtProject.visualPlan?.entries?.length || builtProject.visualPlan.generatedFrom !== 'captions') {
  throw new Error('build-check did not produce a caption-driven Visual Plan');
}
if (!builtProject.visualPlan.entries.every((entry) => entry.resolution === 'matched' && entry.componentId && entry.shot?.kind)) {
  throw new Error('build-check produced unresolved Visual Plan entries');
}
const afterBuild = await request(`/api/projects/${id}/state`);
if (afterBuild.status !== 200 || afterBuild.payload.state.stages.project.status !== 'current' || afterBuild.payload.state.deliveryReady !== false) {
  throw new Error(`project freshness is incorrect after build-check: ${JSON.stringify(afterBuild)}`);
}

const retriedStart = await post(`/api/jobs/${built.id}/retry`, {});
if (retriedStart.status !== 202 || retriedStart.payload.job.retryOf !== built.id) {
  throw new Error(`job retry contract failed: ${JSON.stringify(retriedStart)}`);
}
const retried = await pollJob(retriedStart.payload.job.id);
if (retried.status !== 'done') throw new Error(`retried build-check failed: ${JSON.stringify(retried)}`);

const stillStart = await startJob('project-still');
const conflicting = await post('/api/jobs', {commandId: 'project-check', label: 'must conflict', project});
if (conflicting.status !== 409 || conflicting.payload.code !== 'project_busy') {
  throw new Error(`same-project concurrency gate failed: ${JSON.stringify(conflicting)}`);
}
const still = await pollJob(stillStart.id);
if (still.status !== 'done') throw new Error(`still job failed: ${JSON.stringify(still)}`);
const afterStill = await request(`/api/projects/${id}/state`);
if (afterStill.payload.state.stages.preview.status !== 'current') {
  throw new Error(`preview freshness is incorrect: ${JSON.stringify(afterStill)}`);
}

const delivered = await pollJob((await startJob('render-verify')).id, 300000);
if (delivered.status !== 'done' || delivered.steps.map((step) => step.status).join(',') !== 'done,done') {
  throw new Error(`render-verify workflow failed: ${JSON.stringify(delivered)}`);
}
const afterDelivery = await request(`/api/projects/${id}/state`);
if (
  afterDelivery.status !== 200
  || afterDelivery.payload.state.stages.render.status !== 'current'
  || afterDelivery.payload.state.stages.verify.status !== 'current'
  || afterDelivery.payload.state.deliveryReady !== true
) {
  throw new Error(`delivery readiness is incorrect after render-verify: ${JSON.stringify(afterDelivery)}`);
}

const listed = await request(`/api/jobs?projectId=${id}&limit=20`);
if (listed.status !== 200 || !listed.payload.jobs.some((job) => job.id === still.id)) {
  throw new Error(`job listing contract failed: ${JSON.stringify(listed)}`);
}
const malformed = await request('/api/jobs', {
  method: 'POST',
  headers: {'content-type': 'application/json'},
  body: '{',
});
if (malformed.status !== 400 || malformed.payload.code !== 'malformed_json') {
  throw new Error(`malformed JSON contract failed: ${JSON.stringify(malformed)}`);
}

const forbiddenFileRead = await request('/api/files?path=src/project.json');
if (forbiddenFileRead.status !== 403 || forbiddenFileRead.payload.code !== 'contract_file_forbidden') {
  throw new Error(`contract file read guard failed: ${JSON.stringify(forbiddenFileRead)}`);
}

const readonlyExampleWrite = await post('/api/files', {path: 'examples/skill-showcase.json', data: {ok: false}});
if (readonlyExampleWrite.status !== 403 || readonlyExampleWrite.payload.code !== 'readonly_contract_file') {
  throw new Error(`read-only example guard failed: ${JSON.stringify(readonlyExampleWrite)}`);
}

const forbiddenArtifact = await request('/api/artifact?path=package.json');
if (forbiddenArtifact.status !== 403 || forbiddenArtifact.payload.code !== 'artifact_forbidden') {
  throw new Error(`artifact allowlist guard failed: ${JSON.stringify(forbiddenArtifact)}`);
}

const badOutputProject = {...project, outputVideoPath: 'package.json'};
const badOutput = await post('/api/jobs', {commandId: 'project-render', label: 'bad output path', project: badOutputProject});
if (badOutput.status !== 400 || badOutput.payload.code !== 'invalid_project_paths') {
  throw new Error(`job project path guard failed: ${JSON.stringify(badOutput)}`);
}
NODE

cd "$PROJECT_ROOT"
npm run project:check -- "projects/$TEST_ID/project.json" >/dev/null
npm run project:from-pack -- "projects/$TEST_ID" --out project-built.json >/dev/null
npm run project:check -- "projects/$TEST_ID/project-built.json" >/dev/null

node --input-type=module -e '
  import fs from "node:fs";
  const starter = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const built = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  for (const project of [starter, built]) {
    if (!project.scenes.every((scene) => scene.family === "skill-showcase" && scene.payload.heroStyle === "hero-track-v2")) throw new Error("non-production scene emitted");
  }
  if (starter.render.width !== built.render.width || starter.render.height !== built.render.height) throw new Error("starter/build render mismatch");
' "$TEST_DIR/project.json" "$TEST_DIR/project-built.json"

npm run project:still -- "projects/$TEST_ID/project-built.json" --frame 30 --out "out/$TEST_ID-frame-30.png" >/dev/null
test -s "$PROJECT_ROOT/out/$TEST_ID-frame-30.png"

DUP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$HOST/api/projects" \
  -H 'content-type: application/json' \
  -d "{\"projectId\":\"$TEST_ID\",\"title\":\"重复\",\"orientation\":\"portrait\",\"style\":\"cyan-tech\",\"spokenScript\":\"重复项目必须被拒绝，这段口播长度已经超过二十个汉字。\"}")
test "$DUP_CODE" = "409"

PROJECTS=$(curl -sf "$HOST/api/projects")
node --input-type=module -e '
  const body = JSON.parse(process.argv[1]);
  if (!body.projects.some((project) => project.id === process.argv[2])) throw new Error("created project missing from list");
' "$PROJECTS" "$TEST_ID"

echo "Console generation E2E passed: $TEST_ID"
