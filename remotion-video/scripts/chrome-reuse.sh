#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# chrome-reuse.sh — 检测并复用已有 Chrome 实例（Remotion Lambda / 本地渲染加速）
#
# 用法：
#   source scripts/chrome-reuse.sh    # 在渲染脚本开头 source
#   scripts/chrome-reuse.sh status   # 查看当前 Chrome 实例状态
#   scripts/chrome-reuse.sh kill     # 关闭所有 Chrome 实例
#
# 原理：
#   1. 检查 9222 端口是否有 Chrome remote-debugging 实例
#   2. 若有 → 导出 CHROME_PATH="" 让 Remotion 复用现有实例
#   3. 若无 → 使用系统默认 Chrome，减少重复冷启动
#
# 适用场景：
#   - Lambda 渲染前 warm-up（复用同一个 Chrome 进程）
#   - 本地多次 render 时避免重复打开 Chrome 窗口
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DEBUG_PORT="${CHROME_DEBUG_PORT:-9222}"
MAX_WAIT=5

# ── Helpers ──────────────────────────────────────────────────────────────────

get_chrome_pid() {
  # macOS
  if command -v lsof >/dev/null 2>&1; then
    lsof -i ":${DEBUG_PORT}" -sTCP:LISTEN -t 2>/dev/null | head -1
    return
  fi
  # Linux
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp "sport = :${DEBUG_PORT}" 2>/dev/null | grep -o 'pid=\([0-9]*\)' | cut -d= -f2 | head -1
    return
  fi
  echo ""
}

is_chrome_running() {
  local pid
  pid=$(get_chrome_pid)
  [[ -n "${pid}" && "${pid}" -gt 0 ]] 2>/dev/null
}

get_chrome_binary() {
  local chrome_path=""
  # macOS
  if [[ -d "/Applications/Google Chrome.app" ]]; then
    chrome_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  # Linux
  elif [[ -f "/usr/bin/google-chrome" ]]; then
    chrome_path="/usr/bin/google-chrome"
  elif [[ -f "/usr/bin/chromium-browser" ]]; then
    chrome_path="/usr/bin/chromium-browser"
  elif [[ -f "/usr/bin/chromium" ]]; then
    chrome_path="/usr/bin/chromium"
  fi
  echo "${chrome_path}"
}

# ── Commands ─────────────────────────────────────────────────────────────────

cmd_status() {
  if is_chrome_running; then
    local pid
    pid=$(get_chrome_pid)
    echo "🟢 Chrome running on port ${DEBUG_PORT} (PID=${pid})"
    echo "   Remote debugging: http://localhost:${DEBUG_PORT}"
    echo "   Remotion env:    CHROME_PATH=\"\" (will reuse existing)"
  else
    echo "⚠️  No Chrome on port ${DEBUG_PORT}"
    local bin
    bin=$(get_chrome_binary)
    if [[ -n "${bin}" ]]; then
      echo "   Found at: ${bin}"
    else
      echo "   No Chrome binary found on this system"
    fi
  fi
}

cmd_export() {
  if is_chrome_running; then
    echo "✅ Chrome detected — exporting env vars for Remotion reuse"
    echo "   CHROME_PATH=\"\""
    echo "   CHROMIUM_FLAGS=\"--no-sandbox --disable-dev-shm-usage\""
    export CHROME_PATH=""
    export CHROMIUM_FLAGS="--no-sandbox --disable-dev-shm-usage"
  else
    local bin
    bin=$(get_chrome_binary)
    if [[ -n "${bin}" ]]; then
      echo "📦 No Chrome on :${DEBUG_PORT} — Remotion will launch: ${bin}"
      echo "   CHROME_PATH=\"${bin}\""
      export CHROME_PATH="${bin}"
    else
      echo "⚠️  No Chrome detected — Remotion will attempt to auto-find"
      export CHROME_PATH=""
    fi
  fi
  echo ""
  echo "Run 'cmd_status' to verify."
}

cmd_kill() {
  local pid
  pid=$(get_chrome_pid)
  if [[ -n "${pid}" ]]; then
    echo "🔴 Killing Chrome PID=${pid} on :${DEBUG_PORT}"
    kill "${pid}" 2>/dev/null || true
    echo "✅ Done"
  else
    echo "⚠️  No Chrome running on :${DEBUG_PORT}"
  fi
}

# ── Main ─────────────────────────────────────────────────────────────────────

SUBCMD="${1:-export}"

case "${SUBCMD}" in
  status)  cmd_status ;;
  export)  cmd_export ;;
  kill)    cmd_kill ;;
  *)
    echo "Usage: $0 [status|export|kill]"
    exit 1
    ;;
esac
