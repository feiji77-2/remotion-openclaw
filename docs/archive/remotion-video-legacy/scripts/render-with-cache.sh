#!/bin/bash
# render-with-cache.sh — 已废弃，请使用 Node.js 版本
#   node scripts/render-with-cache.js [--force|--clear]
exec node "$(dirname "$0")/render-with-cache.js" "$@"
