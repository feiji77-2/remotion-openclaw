#!/bin/bash
# render-for-platform.sh — 已废弃，请使用 Node.js 版本
#   node scripts/render-for-platform.js <平台> [command]
exec node "$(dirname "$0")/render-for-platform.js" "$@"
