#!/usr/bin/env bash
# scripts/tools-studio-e2e-smoke.sh
# P3: 端到端回归测试 — 随机端口启动 server、创建项目、build-project 链路、校验、渲染
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
pass() { echo -e "${GREEN}PASS${NC} $1"; }
fail() { echo -e "${RED}FAIL${NC} $1"; exit 1; }
info() { echo -e "${CYAN}---${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PORT=$((8787 + RANDOM % 1000))
HOST="http://127.0.0.1:$PORT"
TEST_ID="p3-e2e-$(date +%H%M%S)"
TEST_DIR="$PROJECT_ROOT/projects/$TEST_ID"

cleanup() {
  info "cleaning up..."
  rm -rf "$TEST_DIR" "$PROJECT_ROOT/public/projects/$TEST_ID" "$PROJECT_ROOT/out/$TEST_ID"* 2>/dev/null || true
  if [ -n "${SERVER_PID:-}" ]; then kill "$SERVER_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT

# ── 1. Start server ──────────────────────────────────────────────────────
info "1. Starting tools-studio-server on port $PORT..."
VIDEO_FACTORY_PORT=$PORT node "$PROJECT_ROOT/scripts/tools-studio-server.mjs" &
SERVER_PID=$!
sleep 2

# Health check
if ! curl -sf "$HOST/api/health" > /dev/null 2>&1; then
  fail "server did not start"
fi
pass "server online"

# ── 2. Create project (happy path) ───────────────────────────────────────
info "2. POST /api/projects (style=tech, landscape, keywords)..."
RESP=$(curl -sf -X POST "$HOST/api/projects" \
  -H 'content-type: application/json' \
  -d "{\"projectId\":\"$TEST_ID\",\"title\":\"E2E 回归验证\",\"orientation\":\"landscape\",\"style\":\"tech\",\"spokenScript\":\"这是一条用于端到端回归测试的口播稿。内容应当包含至少二十个汉字以上。\",\"keywords\":\"E2E,回归测试,自动化\"}")
OK=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['ok'])")
[ "$OK" = "True" ] || fail "create project returned ok=false"
pass "project created ($TEST_ID)"

# ── 3. Verify project files ─────────────────────────────────────────────
info "3. Verifying files on disk..."
[ -f "$TEST_DIR/brief.json" ] || fail "brief.json missing"
[ -f "$TEST_DIR/script-pack.json" ] || fail "script-pack.json missing"
[ -f "$TEST_DIR/asset-pack.json" ] || fail "asset-pack.json missing"
[ -f "$TEST_DIR/project.json" ] || fail "project.json missing"
pass "all 4 contract files exist"

# ── 4. Verify project.json field mapping ─────────────────────────────────
info "4. Verifying field mapping..."
python3 -c "
import json
with open('$TEST_DIR/project.json') as f:
    p = json.load(f)
assert p['render']['orientation'] == 'landscape', 'orientation'
assert p['render']['width'] == 1920, 'width'
assert p['render']['height'] == 1080, 'height'
assert p['render']['fps'] == 30, 'fps'
assert p['render']['captionStyle'] == 'boxed', 'captionStyle'
assert len(p['scenes']) == 3, 'scenes count'
assert p['scenes'][0]['family'] == 'spoken-title', 'scene[0] family'
assert p['scenes'][0]['payload']['kicker'] == 'TECH', 'kicker'
assert p['scenes'][0]['payload']['accent'] == 'green', 'accent'
assert p['scenes'][1]['family'] == 'spoken-tags', 'scene[1] family'
items = p['scenes'][1]['payload']['items']
labels = [i['label'] for i in items]
assert 'E2E' in labels, 'keyword E2E'
assert '回归测试' in labels, 'keyword 回归测试'
assert '自动化' in labels, 'keyword 自动化'
assert len(p['captions']) == 2, 'captions count'
print('field mapping: all assertions passed')
" || fail "field mapping incorrect"
pass "field mapping verified"

# ── 5. project:check ─────────────────────────────────────────────────────
info "5. npm run project:check..."
cd "$PROJECT_ROOT"
if npm run project:check -- "projects/$TEST_ID/project.json" 2>&1 | tail -1 | python3 -c "
import sys, json
line = sys.stdin.read().strip()
result = json.loads(line)
assert result.get('ok') == True, f'project:check ok=false: {line}'
" 2>/dev/null; then
  pass "project:check passed"
else
  # retry with stderr redirected
  npm run project:check -- "projects/$TEST_ID/project.json" > /dev/null 2>&1 || fail "project:check failed (non-zero exit)"
  pass "project:check passed (exit code)"
fi

# ── 5b. P3 critical: build-project → render fields preserved ────────────
info "5b. npm run production:build-project (verify render fields)..."
BUILD_OUT="$PROJECT_ROOT/projects/$TEST_ID/project-built.json"
npm run production:build-project -- "projects/$TEST_ID" --out project-built.json 2>&1 > /dev/null || fail "build-project failed"
[ -f "$BUILD_OUT" ] || fail "project-built.json not produced"
python3 -c "
import json
with open('$BUILD_OUT') as f:
    p = json.load(f)
r = p['render']
assert r['width'] == 1920, f'width: {r[\"width\"]} != 1920'
assert r['height'] == 1080, f'height: {r[\"height\"]} != 1080'
assert r['orientation'] == 'landscape', f'orientation: {r[\"orientation\"]}'
assert r['captionStyle'] == 'boxed', f'captionStyle: {r[\"captionStyle\"]}'
assert r['showProjectLabel'] == True, f'showProjectLabel: {r[\"showProjectLabel\"]}'
assert len(p['scenes']) >= 4, f'expected >=4 scenes after build, got {len(p[\"scenes\"])}'
# Tech style: primary accent must include green
allAccents = [s['payload'].get('accent') for s in p['scenes'] if s['payload'].get('accent')]
assert 'green' in allAccents, f'tech style missing green in: {allAccents}'
print('build-project render fields: all assertions passed')
" || fail "build-project render field mismatch"
pass "build-project preserve landscape orientation + tech accents"

# ── 5c. P4: cinematic + portrait scenario ─────────────────────────────
CINE_ID="p4-cine-$(date +%H%M%S)"
info "5c. Second scenario: cinematic + portrait..."
curl -sf -X POST "$HOST/api/projects" \
  -H 'content-type: application/json' \
  -d "{\"projectId\":\"$CINE_ID\",\"title\":\"电影感竖屏测试\",\"orientation\":\"portrait\",\"style\":\"cinematic\",\"spokenScript\":\"电影感测试口播稿，至少二十个汉字。这是一条用于验证 cinematic 风格的竖屏视频。\",\"keywords\":\"电影,氛围\"}" > /dev/null
npm run production:build-project -- "projects/$CINE_ID" --out project-built.json 2>&1 > /dev/null || fail "build-project cine failed"
CINE_BUILD="$PROJECT_ROOT/projects/$CINE_ID/project-built.json"
python3 -c "
import json
with open('$CINE_BUILD') as f:
    p = json.load(f)
r = p['render']
assert r['width'] == 1080, f'cine width: {r[\"width\"]} != 1080'
assert r['height'] == 1920, f'cine height: {r[\"height\"]} != 1920'
assert r['orientation'] == 'portrait', f'cine orientation: {r[\"orientation\"]}'
# cinematic → editorial captions
assert r['captionStyle'] == 'editorial', f'cine captionStyle: {r[\"captionStyle\"]} != editorial'
# cinematic accents: primary must be amber
allAccents = [s['payload'].get('accent') for s in p['scenes'] if s['payload'].get('accent')]
assert 'amber' in allAccents, f'cinematic missing amber in: {allAccents}'
print('cinematic+portrait: all assertions passed')
" || fail "cinematic render field mismatch"
# Cleanup cinematic test project
rm -rf "$PROJECT_ROOT/projects/$CINE_ID" "$PROJECT_ROOT/public/projects/$CINE_ID" 2>/dev/null || true
pass "cinematic+portrait → editorial captions + amber/orange accents"

# ── 6. project:still ────────────────────────────────────────────────────
info "6. npm run project:still..."
STILL_OUT="$PROJECT_ROOT/out/$TEST_ID-frame-30.png"
npm run project:still -- "projects/$TEST_ID/project.json" --frame 30 --out "$STILL_OUT" 2>&1 > /dev/null
[ -f "$STILL_OUT" ] || fail "still not produced"
SIZE=$(stat -f%z "$STILL_OUT" 2>/dev/null || stat -c%s "$STILL_OUT" 2>/dev/null || echo 0)
[ "$SIZE" -gt 10000 ] || fail "still too small (${SIZE} bytes, likely black)"
pass "still rendered ($SIZE bytes)"

# ── 7. Duplicate project rejection ──────────────────────────────────────
info "7. POST duplicate project → expect 409..."
DUP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$HOST/api/projects" \
  -H 'content-type: application/json' \
  -d "{\"projectId\":\"$TEST_ID\",\"title\":\"Duplicate\",\"orientation\":\"portrait\",\"style\":\"swiss\",\"spokenScript\":\"这是一个重复项目创建请求应该被拒绝因为项目ID已存在。\"}")
[ "$DUP_CODE" = "409" ] || fail "expected 409 for duplicate, got $DUP_CODE"
pass "duplicate rejected (409)"

# ── 8. Invalid projectId rejection ──────────────────────────────────────
info "8. POST invalid projectId → expect 400..."
INV_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$HOST/api/projects" \
  -H 'content-type: application/json' \
  -d '{"projectId":"bad/id!","title":"Bad","orientation":"portrait","style":"swiss","spokenScript":"测试测试测试测试测试测试测试测试测试"}' 2>&1)
[ "$INV_CODE" = "400" ] || fail "expected 400 for invalid projectId, got $INV_CODE"
pass "invalid projectId rejected (400)"

# ── 9. Short spokenScript rejection ─────────────────────────────────────
info "9. POST short spokenScript → expect 400..."
SHORT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$HOST/api/projects" \
  -H 'content-type: application/json' \
  -d '{"projectId":"short","title":"Short","orientation":"portrait","style":"swiss","spokenScript":"太短"}' 2>&1)
[ "$SHORT_CODE" = "400" ] || fail "expected 400 for short script, got $SHORT_CODE"
pass "short script rejected (400)"

# ── 10. GET projects includes new project ────────────────────────────────
info "10. GET /api/projects includes new project..."
PROJECTS=$(curl -sf "$HOST/api/projects")
echo "$PROJECTS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
ids = [p['id'] for p in data['projects']]
assert '$TEST_ID' in ids, f'$TEST_ID not in project list: {ids}'
print('project found in list')
" || fail "project not in list"
pass "project appears in GET /api/projects"

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  P4 E2E Smoke: ALL 11 CHECKS PASSED${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
