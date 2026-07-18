#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# validate-video.sh
# Usage: bash scripts/validate-video.sh <video.mp4> [expected-width] [expected-height] [expected-fps]
#
# Validates a rendered MP4 video:
#   - File exists and is non-empty
#   - Resolution matches expected width x height (default 1920x1080)
#   - Frame rate is approximately 30 fps (default, accepts ±0.2)
#   - Audio tracks are valid (optional, reports count)
#   - Duration is non-zero
#
# Exit code 0 on success, non-zero on failure with clear error messages.
# ─────────────────────────────────────────────────────────

# ---- Dependencies check ----
for cmd in ffprobe ffmpeg; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: Required dependency '$cmd' not found. Install ffmpeg first." >&2
    exit 1
  fi
done

# ---- Parse arguments ----
VIDEO_FILE="${1:?"Usage: $0 <video.mp4> [expected-width] [expected-height] [expected-fps]"}"
EXPECTED_WIDTH="${2:-1920}"
EXPECTED_HEIGHT="${3:-1080}"
EXPECTED_FPS="${4:-30}"

FPS_MIN=$(awk "BEGIN {printf \"%.1f\", $EXPECTED_FPS - 0.2}")
FPS_MAX=$(awk "BEGIN {printf \"%.1f\", $EXPECTED_FPS + 0.2}")

# ---- Help / Usage guard ----
if [[ "$VIDEO_FILE" == "-h" || "$VIDEO_FILE" == "--help" ]]; then
  echo "Usage: $0 <video.mp4> [expected-width] [expected-height] [expected-fps]"
  echo ""
  echo "Validates a rendered MP4 video against expected specs."
  echo "Default expected dimensions: 1920x1080 at 30 fps."
  exit 0
fi

# ---- File existence ----
if [[ ! -f "$VIDEO_FILE" ]]; then
  echo "FAIL: Video file not found: $VIDEO_FILE" >&2
  exit 1
fi

if [[ ! -s "$VIDEO_FILE" ]]; then
  echo "FAIL: Video file is empty: $VIDEO_FILE" >&2
  exit 1
fi

# ---- Probe video metadata ----
probe_json() {
  ffprobe -v error \
    -select_streams v:0 \
    -show_entries stream=width,height,avg_frame_rate,r_frame_rate,duration \
    -show_entries format=duration \
    -of json \
    "$1"
}

JSON="$(probe_json "$VIDEO_FILE")"

# Validate JSON was successfully produced
if [[ -z "$JSON" ]]; then
  echo "FAIL: ffprobe produced no output for $VIDEO_FILE (corrupt or unreadable file)" >&2
  exit 1
fi

WIDTH=$(jq -r '.streams[0].width // 0' <<<"$JSON")
HEIGHT=$(jq -r '.streams[0].height // 0' <<<"$JSON")
FPS_RAW=$(jq -r '.streams[0].avg_frame_rate // .streams[0].r_frame_rate // "0/0"' <<<"$JSON")
DURATION=$(jq -r '.format.duration // .streams[0].duration // 0' <<<"$JSON")
FPS=$(awk -F/ 'BEGIN { f = 0 } $2 > 0 { f = $1 / $2 } END { printf "%.3f", f }' <<<"$FPS_RAW")
AUDIO_COUNT=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$VIDEO_FILE" | awk 'END { print NR }')

# ---- Status summary ----
echo "=== Video Validation Report ==="
echo "  File:       $VIDEO_FILE"
echo "  Dimensions: ${WIDTH}x${HEIGHT}"
echo "  FPS:        $FPS"
echo "  Duration:   ${DURATION}s"
echo "  Audio:      $AUDIO_COUNT track(s)"
echo ""

# ---- Checks ----
HAS_ERROR=false

# Resolution check
if [[ "$WIDTH" -ne "$EXPECTED_WIDTH" ]]; then
  echo "FAIL: Width is ${WIDTH}px, expected ${EXPECTED_WIDTH}px" >&2
  HAS_ERROR=true
fi

if [[ "$HEIGHT" -ne "$EXPECTED_HEIGHT" ]]; then
  echo "FAIL: Height is ${HEIGHT}px, expected ${EXPECTED_HEIGHT}px" >&2
  HAS_ERROR=true
fi

# Frame rate check (allow ±0.2 fps tolerance)
WITHIN_FPS=$(awk -v fps="$FPS" -v min="$FPS_MIN" -v max="$FPS_MAX" 'BEGIN { print (fps >= min && fps <= max) ? "yes" : "no" }')
if [[ "$WITHIN_FPS" != "yes" ]]; then
  echo "FAIL: FPS is ${FPS}, expected ${EXPECTED_FPS} (range ${FPS_MIN}-${FPS_MAX})" >&2
  HAS_ERROR=true
fi

# Duration check (must be positive / non-zero)
DURATION_OK=$(awk -v dur="$DURATION" 'BEGIN { print (dur > 0) ? "yes" : "no" }')
if [[ "$DURATION_OK" != "yes" ]]; then
  echo "FAIL: Duration is ${DURATION}s, expected positive non-zero value" >&2
  HAS_ERROR=true
fi

# Audio check (report info; MP4 containers commonly include a silent AAC track even without audio assets)
if [[ "$AUDIO_COUNT" -gt 0 ]]; then
  FIRST_AUDIO_CODEC=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE")
  if [[ -z "$FIRST_AUDIO_CODEC" ]]; then
    echo "FAIL: Audio track found but codec unknown" >&2
    HAS_ERROR=true
  fi
fi

# ---- Result ----
if [[ "$HAS_ERROR" == "true" ]]; then
  echo ""
  echo "FAIL: Video validation failed for $VIDEO_FILE" >&2
  exit 1
fi

echo "PASS: $VIDEO_FILE meets all specs (${EXPECTED_WIDTH}x${EXPECTED_HEIGHT} @ ${EXPECTED_FPS}fps, audio: ${AUDIO_COUNT} track(s))"
