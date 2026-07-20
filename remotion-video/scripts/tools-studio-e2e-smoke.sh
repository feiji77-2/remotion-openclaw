#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PORT=$((8787 + RANDOM % 1000))
HOST="http://127.0.0.1:$PORT"
TEST_ID="console-e2e-$(date +%H%M%S)"
TEST_DIR="$PROJECT_ROOT/projects/$TEST_ID"

cleanup() {
  rm -rf "$TEST_DIR" "$PROJECT_ROOT/public/projects/$TEST_ID" "$PROJECT_ROOT/out/$TEST_ID"* 2>/dev/null || true
  if [ -n "${SERVER_PID:-}" ]; then kill "$SERVER_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT

VIDEO_FACTORY_PORT=$PORT node "$PROJECT_ROOT/scripts/tools-studio-server.mjs" &
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
