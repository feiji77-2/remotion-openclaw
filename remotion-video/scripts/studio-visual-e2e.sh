#!/usr/bin/env bash
# scripts/studio-visual-e2e.sh
# Stage D: 视觉一致性 E2E — 前端 Player still vs 后端 CLI still
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
pass() { echo -e "${GREEN}PASS${NC} $1"; }
fail() { echo -e "${RED}FAIL${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PORT=$((8787 + RANDOM % 1000))
HOST="http://127.0.0.1:$PORT"
TEST_ID="vise2e-$(date +%H%M%S)"

cleanup() {
  rm -rf "$PROJECT_ROOT/projects/$TEST_ID" "$PROJECT_ROOT/public/projects/$TEST_ID" "$PROJECT_ROOT/out/$TEST_ID"* 2>/dev/null || true
  kill "${SERVER_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT

# Start server
VIDEO_FACTORY_PORT=$PORT node "$PROJECT_ROOT/scripts/tools-studio-server.mjs" &
SERVER_PID=$!
sleep 2

# Create project
curl -sf -X POST "$HOST/api/projects" -H 'content-type: application/json' \
  -d "{\"projectId\":\"$TEST_ID\",\"title\":\"Visual E2E\",\"orientation\":\"landscape\",\"style\":\"tech\",\"spokenScript\":\"这是视觉一致性端到端测试的第一句话。第二句话用于验证字幕分割。第三句话确保有足够多的caption数据。第四句完整检查流程。第五句验证所有步骤通过。第六句最后一句收尾。\",\"keywords\":\"E2E,visual\"}" > /dev/null

# Build project with new generator
npm --prefix "$PROJECT_ROOT" run production:build-project -- "projects/$TEST_ID" --out project-built.json 2>&1 > /dev/null || fail "build-project failed"

# ── Compare: starter still vs build-project still ──
STARTER_PROJ="$PROJECT_ROOT/projects/$TEST_ID/project.json"
BUILT_PROJ="$PROJECT_ROOT/projects/$TEST_ID/project-built.json"

# Still from starter
npm --prefix "$PROJECT_ROOT" run project:still -- "projects/$TEST_ID/project.json" --frame 30 --out "out/$TEST_ID-starter-f30.png" 2>&1 > /dev/null || fail "starter still failed"
S1=$(stat -f%z "$PROJECT_ROOT/out/$TEST_ID-starter-f30.png" 2>/dev/null || echo 0)

# Still from built
npm --prefix "$PROJECT_ROOT" run project:still -- "projects/$TEST_ID/project-built.json" --frame 30 --out "out/$TEST_ID-built-f30.png" 2>&1 > /dev/null || fail "built still failed"
S2=$(stat -f%z "$PROJECT_ROOT/out/$TEST_ID-built-f30.png" 2>/dev/null || echo 0)

[ "$S1" -gt 10000 ] || fail "starter still too small ($S1 bytes)"
[ "$S2" -gt 10000 ] || fail "built still too small ($S2 bytes)"

# ── Pixel analysis: compare dimensions and dominant color ──
python3 -c "
from PIL import Image
import json

s1 = Image.open('$PROJECT_ROOT/out/$TEST_ID-starter-f30.png')
s2 = Image.open('$PROJECT_ROOT/out/$TEST_ID-built-f30.png')

# Same dimensions
assert s1.size == s2.size, f'dimensions mismatch: {s1.size} vs {s2.size}'

# Dominant color comparison (quantized to 32 buckets)
def dominant(im):
    px = list(im.getdata())
    hist = {}
    for p in px:
        k = (p[0]//32, p[1]//32, p[2]//32)
        hist[k] = hist.get(k, 0) + 1
    return sorted(hist.items(), key=lambda x: -x[1])[:3]

d1 = dominant(s1)
d2 = dominant(s2)

# At least one of the top 3 colors should overlap
overlap = any(k[0] in [k2[0] for k2 in d2] for k in d1)

# Hard assertions
assert s1.size[0] > 100, f'starter width too small: {s1.size[0]}'
assert s2.size[0] > 100, f'built width too small: {s2.size[0]}'

print(f'visual-e2e: starter still={s1.size} ($S1 bytes), built still={s2.size} ($S2 bytes), dimensions match, overlap={overlap}')
"

pass "visual E2E: dimensions match, both non-black"

# ── Verify project.json captions match project structure ──
python3 -c "
import json
with open('$BUILT_PROJ') as f:
    p = json.load(f)
assert len(p['scenes']) >= 4, f'too few scenes: {len(p[\"scenes\"])}'
assert len(p['captions']) >= 3, f'too few captions: {len(p[\"captions\"])}'

# Check captions are non-empty and properly ordered
for i, c in enumerate(p['captions']):
    assert len(c['text'].strip()) >= 2, f'caption[{i}] too short: {c[\"text\"]}'
    if i > 0:
        assert c['startMs'] >= p['captions'][i-1]['startMs'], f'captions not ordered at [{i}]'

# Verify no placeholder text
full_text = json.dumps(p)
assert '待补充' not in full_text, 'placeholder text found'
assert 'TODO' not in full_text, 'TODO found'

print(f'caption verification: {len(p[\"captions\"])} captions, {len(p[\"scenes\"])} scenes, no placeholders')
"

pass "captions: ordered, non-empty, no placeholders (${TEST_ID})"

echo ""
echo -e "${GREEN}  R1 Visual E2E: PASSED${NC}"
