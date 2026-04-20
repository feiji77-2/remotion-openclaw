#!/bin/bash
# ============================================================
# OpenClaw Video Pipeline — 一键启动脚本
# ============================================================
# 用法：
#   ./scripts/start-pipeline.sh          # 启动全部（API + Worker）
#   ./scripts/start-pipeline.sh --api    # 只启动 API
#   ./scripts/start-pipeline.sh --worker # 只启动 Worker
#   ./scripts/start-pipeline.sh --redis  # 只启动 Redis（Docker）
# 环境变量：
#   PIPELINE_QUEUE_MODE=file|redis       # 默认 redis，file 仅限开发
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# 颜色
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log() { echo -e "${GREEN}[start]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err() { echo -e "${RED}[error]${NC} $1"; }

QUEUE_MODE="${PIPELINE_QUEUE_MODE:-file}"

# ─── Redis 检测 ──────────────────────────────────────────
check_redis() {
  if command -v redis-cli &>/dev/null; then
    if redis-cli ping &>/dev/null 2>&1; then
      log "Redis: ✅ connected"
      return 0
    fi
  fi
  
  # 检查 Docker Redis
  if docker ps --format '{{.Names}}' | grep -q redis; then
    log "Redis (Docker): ✅ running"
    return 0
  fi
  
  warn "Redis not found. Options:"
  echo "  1. Install Redis:     brew install redis && redis-server"
  echo "  2. Or use Docker:      docker run -p 6379:6379 redis:latest"
  echo ""
  echo "  Or use the default local file queue mode:"
  echo "    PIPELINE_ALLOW_FILE_QUEUE=true PIPELINE_QUEUE_MODE=file node server/api/server.js"
  echo ""
  return 1
}

# ─── API Server ──────────────────────────────────────────
start_api() {
  log "Starting API Server..."
  log "  URL: http://localhost:3001"
  log "  Docs: http://localhost:3001/"
  PIPELINE_QUEUE_MODE="$QUEUE_MODE" node server/api/server.js
}

# ─── Render Worker ───────────────────────────────────────
start_worker() {
  log "Starting Render Worker..."
  log "  Concurrency: ${WORKER_CONCURRENCY:-2}"
  log "  Queue mode: ${QUEUE_MODE}"
  PIPELINE_QUEUE_MODE="$QUEUE_MODE" node server/workers/renderWorker.js
}

# ─── Redis via Docker ─────────────────────────────────────
start_redis_docker() {
  if docker ps --format '{{.Names}}' | grep -q redis; then
    warn "Redis already running in Docker"
    return
  fi
  log "Starting Redis (Docker)..."
  docker run -d --name openclaw-redis -p 6379:6379 redis:latest
  sleep 2
  if redis-cli -h localhost ping &>/dev/null; then
    log "Redis: ✅ started on localhost:6379"
  fi
}

# ─── Main ─────────────────────────────────────────────────
MODE="${1:-all}"

if [ "$MODE" = "--redis" ]; then
  start_redis_docker
  exit 0
fi

# 仅 Redis 模式需要检查 Redis
if [ "$QUEUE_MODE" = "redis" ]; then
  if ! check_redis; then
    err "Redis is required for redis queue mode. Exiting."
    exit 1
  fi
else
  log "Queue mode: file (local JSON queue, no Redis required)"
fi

if [ "$MODE" = "--api" ]; then
  start_api
elif [ "$MODE" = "--worker" ]; then
  start_worker
else
  log "🎬 OpenClaw Video Pipeline — Starting all services..."
  echo ""

  # 启动 Worker（后台）
  start_worker &
  WORKER_PID=$!

  # 等待 Worker 就绪
  sleep 2

  # 启动 API（前台）
  log ""
  log "🎬 All services ready!"
  log "   API Docs: http://localhost:3001/"
  log "   Health:   http://localhost:3001/health"
  log ""
  log "   提交任务: POST http://localhost:3001/api/render"
  log "   查询状态: GET  http://localhost:3001/api/render/:jobId"
  echo ""

  start_api

  # 清理
  kill $WORKER_PID 2>/dev/null || true
fi
