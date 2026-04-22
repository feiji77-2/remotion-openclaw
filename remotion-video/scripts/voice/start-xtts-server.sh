#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_DIR="${XTTS_VENV_DIR:-$ROOT_DIR/.venvs/xtts}"
PYTHON_BIN="${XTTS_PYTHON_BIN:-$VENV_DIR/bin/python3}"
UV_BIN="${XTTS_UV_BIN:-$(command -v uv || true)}"
HOST="${XTTS_HOST:-127.0.0.1}"
PORT="${XTTS_PORT:-18083}"
DEVICE="${XTTS_DEVICE:-}"
SPEAKERS_DIR="${XTTS_SPEAKERS_DIR:-$ROOT_DIR/runtime/voices/xtts}"
LLVM_PREFIX="${XTTS_LLVM_PREFIX:-}"

if [[ -z "$UV_BIN" ]]; then
  echo "[xtts-start] uv 未安装，先执行: curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
  exit 1
fi

mkdir -p "$SPEAKERS_DIR"

if [[ -z "$DEVICE" ]]; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    DEVICE="cpu"
    echo "[xtts-start] macOS 默认使用 cpu，更稳；如需强制尝试 MPS，可手动设置 XTTS_DEVICE=mps"
  else
    DEVICE="auto"
  fi
fi

if ! command -v cmake >/dev/null 2>&1 || ! command -v ninja >/dev/null 2>&1; then
  echo "[xtts-start] 缺少 cmake / ninja，先执行: brew install cmake ninja" >&2
  exit 1
fi

if [[ -z "$LLVM_PREFIX" ]]; then
  if [[ -d "/usr/local/opt/llvm@20" ]]; then
    LLVM_PREFIX="/usr/local/opt/llvm@20"
  elif [[ -d "/opt/homebrew/opt/llvm@20" ]]; then
    LLVM_PREFIX="/opt/homebrew/opt/llvm@20"
  elif [[ -d "/usr/local/opt/llvm" ]]; then
    LLVM_PREFIX="/usr/local/opt/llvm"
  elif [[ -d "/opt/homebrew/opt/llvm" ]]; then
    LLVM_PREFIX="/opt/homebrew/opt/llvm"
  fi
fi

if [[ -n "$LLVM_PREFIX" ]]; then
  export PATH="$LLVM_PREFIX/bin:$PATH"
  export LDFLAGS="-L$LLVM_PREFIX/lib ${LDFLAGS:-}"
  export CPPFLAGS="-I$LLVM_PREFIX/include ${CPPFLAGS:-}"
  export CMAKE_PREFIX_PATH="$LLVM_PREFIX;$LLVM_PREFIX/lib/cmake/llvm"
  export CMAKE_IGNORE_PREFIX_PATH="/usr/local/opt/llvm:/opt/homebrew/opt/llvm"
  export LLVM_DIR="$LLVM_PREFIX/lib/cmake/llvm"
  export LLVM_CONFIG="$LLVM_PREFIX/bin/llvm-config"
  export CMAKE_ARGS="-DLLVM_DIR=$LLVM_DIR"
fi

if ! command -v llvm-config >/dev/null 2>&1; then
  echo "[xtts-start] 缺少 llvm-config，先执行: brew install llvm@20" >&2
  exit 1
fi

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "[xtts-start] 创建 Python 3.11 虚拟环境: $VENV_DIR"
  "$UV_BIN" python install 3.11
  "$UV_BIN" venv --python 3.11 "$VENV_DIR"
fi

if ! "$PYTHON_BIN" - <<'PY' >/dev/null 2>&1
import importlib.util
from importlib import metadata
import sys


def parse_version(value):
    parts = []
    for item in str(value).split('.'):
        digits = ''.join(ch for ch in item if ch.isdigit())
        if not digits:
            break
        parts.append(int(digits))
    return tuple(parts or [0])


def has_spec(name):
    return importlib.util.find_spec(name) is not None


missing = [name for name in ("TTS", "torch", "numpy", "transformers") if not has_spec(name)]
if missing:
    sys.exit(1)

import numpy  # noqa: E402
import transformers  # noqa: E402

issues = []
if parse_version(numpy.__version__) >= (2, 0):
    issues.append(f"numpy={numpy.__version__}")

transformers_version = parse_version(transformers.__version__)
if transformers_version < (4, 33) or transformers_version >= (5, 0):
    issues.append(f"transformers={transformers.__version__}")

try:
    from transformers import BeamSearchScorer  # noqa: F401,E402
except Exception as exc:  # pragma: no cover
    issues.append(f"BeamSearchScorer import failed: {exc}")

try:
    metadata.version("TTS")
    metadata.version("torch")
except Exception as exc:  # pragma: no cover
    issues.append(str(exc))

sys.exit(0 if not issues else 1)
PY
then
  echo "[xtts-start] 安装 / 修复 XTTS 依赖"
  "$UV_BIN" pip install --python "$PYTHON_BIN" --upgrade --force-reinstall \
    "numpy<2" \
    "transformers>=4.33,<5" \
    "TTS>=0.22,<0.23"
fi

export XTTS_SPEAKERS_DIR="$SPEAKERS_DIR"

if [[ "${XTTS_ACCEPT_CPML:-0}" == "1" ]]; then
  export COQUI_TOS_AGREED="1"
fi

if [[ "$DEVICE" == "mps" || "$DEVICE" == "auto" ]]; then
  export PYTORCH_ENABLE_MPS_FALLBACK="${PYTORCH_ENABLE_MPS_FALLBACK:-1}"
fi

echo "[xtts-start] host=$HOST port=$PORT device=$DEVICE"
echo "[xtts-start] speakers_dir=$XTTS_SPEAKERS_DIR"

exec "$PYTHON_BIN" "$ROOT_DIR/scripts/voice/xtts_http_server.py" \
  --host "$HOST" \
  --port "$PORT" \
  --device "$DEVICE" \
  --speakers-dir "$XTTS_SPEAKERS_DIR"
