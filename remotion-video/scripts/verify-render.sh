#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# verify-render.sh
# Usage: bash scripts/verify-render.sh <project.json> <output.mp4>
#
# End-to-end render verification:
#   1. Validates the project JSON with `npm run project:check`
#   2. Checks the output file exists
#   3. Runs validate-video.sh to verify video specs
#
# Exit code 0 on success, non-zero on failure.
# ─────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---- Dependencies check ----
for cmd in ffprobe jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: Required dependency '$cmd' not found." >&2
    exit 1
  fi
done

# ---- Help guard ----
if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  echo "Usage: $0 <project.json> <output.mp4>"
  echo ""
  echo "End-to-end verification of a rendered video project."
  echo "Steps:"
  echo "  1. npm run project:check -- --props <project.json>"
  echo "  2. Check output.mp4 exists and is non-empty"
  echo "  3. scripts/validate-video.sh <output.mp4>"
  echo ""
  echo "All arguments are optional; defaults are:"
  echo "  project.json  -> examples/project.json"
  echo "  output.mp4    -> out/project.mp4"
  exit 0
fi

PROJECT_JSON="${1:-examples/project.json}"
OUTPUT_MP4="${2:-out/project.mp4}"

# Resolve project JSON to absolute path if it's relative
if [[ "$PROJECT_JSON" != /* ]]; then
  PROJECT_JSON="$PROJECT_DIR/$PROJECT_JSON"
fi
# Resolve output MP4 to absolute path if it's relative
if [[ "$OUTPUT_MP4" != /* ]]; then
  OUTPUT_MP4="$PROJECT_DIR/$OUTPUT_MP4"
fi

echo "=== Render Verification ==="
echo "  Project:  $PROJECT_JSON"
echo "  Output:   $OUTPUT_MP4"
echo ""

# ---- Step 1: Validate project JSON ----
echo "--- Step 1: Project JSON validation ---"
if [[ ! -f "$PROJECT_JSON" ]]; then
  echo "FAIL: Project file not found: $PROJECT_JSON" >&2
  exit 1
fi

cd "$PROJECT_DIR"
if ! npm run project:check -- "$PROJECT_JSON" 2>&1; then
  echo "FAIL: Project JSON validation failed" >&2
  exit 1
fi
echo "PASS: Project JSON is valid"
echo ""

# ---- Step 2: Check output file exists ----
echo "--- Step 2: Output file check ---"
if [[ ! -f "$OUTPUT_MP4" ]]; then
  echo "FAIL: Output file not found: $OUTPUT_MP4" >&2
  exit 1
fi
if [[ ! -s "$OUTPUT_MP4" ]]; then
  echo "FAIL: Output file is empty: $OUTPUT_MP4" >&2
  exit 1
fi
echo "PASS: Output file exists and is non-empty"
echo ""

# ---- Step 3: Validate video specs ----
echo "--- Step 3: Video spec validation ---"
bash "$SCRIPT_DIR/validate-video.sh" "$OUTPUT_MP4"
echo ""

# ---- All checks passed ----
echo "PASS: All render verification checks passed for $OUTPUT_MP4"
