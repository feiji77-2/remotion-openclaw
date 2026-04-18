#!/bin/bash
# render-qa.sh — 已废弃，请使用 Node.js 版本
#   node scripts/render-qa.js                   # 完整 QA
#   node scripts/render-qa.js --frames          # 仅关键帧
#   node scripts/render-qa.js --sync            # 仅音画同步
exec node "$(dirname "$0")/render-qa.js" "$@"
