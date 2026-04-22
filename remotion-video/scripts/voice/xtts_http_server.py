#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import traceback
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PUBLIC_DIR = PROJECT_ROOT / "public"
DEFAULT_MODEL = "tts_models/multilingual/multi-dataset/xtts_v2"
DEFAULT_SPEAKERS_DIR = PROJECT_ROOT / "runtime" / "voices" / "xtts"

STATE = {
    "status": "loading",
    "error": None,
    "device": None,
    "model_name": None,
    "tts": None,
}
MODEL_LOCK = Lock()


def log(message):
    sys.stdout.write(f"[xtts-http] {message}\n")
    sys.stdout.flush()


def normalize_language(value):
    normalized = str(value or "zh-cn").strip().lower()
    if normalized in ("zh", "zh-cn"):
        return "zh-cn"
    if normalized in ("en", "en-us"):
        return "en"
    if normalized in ("ja", "jp"):
        return "ja"
    if normalized in ("ko", "kr"):
        return "ko"
    if normalized in ("pt", "pt-br"):
        return "pt"
    return normalized or "zh-cn"


def choose_device(requested):
    import torch

    normalized = str(requested or "auto").strip().lower()
    if normalized == "cpu":
        return "cpu"
    if normalized == "mps":
        if torch.backends.mps.is_available():
            return "mps"
        raise RuntimeError("Requested device=mps but torch.backends.mps.is_available() is false")
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_model(model_name, requested_device):
    from TTS.api import TTS

    device = choose_device(requested_device)
    log(f"loading model={model_name} device={device}")
    tts = TTS(model_name=model_name, progress_bar=False)
    tts = tts.to(device)
    STATE["status"] = "ok"
    STATE["error"] = None
    STATE["device"] = device
    STATE["model_name"] = model_name
    STATE["tts"] = tts
    log("model loaded")


def should_retry_on_cpu(exc):
    detail = f"{type(exc).__name__}: {exc}".lower()
    if STATE.get("device") != "mps":
        return False
    keywords = (
        "mps",
        "complexfloat",
        "aten::_fft_r2c",
        "not currently implemented",
        "not currently supported",
    )
    return any(keyword in detail for keyword in keywords)


def synthesize_to_file(text, reference_audio, language, output_path):
    assert STATE["tts"] is not None

    try:
        STATE["tts"].tts_to_file(
            text=text,
            speaker_wav=str(reference_audio),
            language=language,
            file_path=str(output_path),
        )
    except Exception as exc:
        if not should_retry_on_cpu(exc):
            raise

        current_model = STATE["model_name"] or DEFAULT_MODEL
        log("mps synthesis failed, reloading model on cpu and retrying once")
        load_model(current_model, "cpu")
        assert STATE["tts"] is not None
        STATE["tts"].tts_to_file(
            text=text,
            speaker_wav=str(reference_audio),
            language=language,
            file_path=str(output_path),
        )


def try_load_model(model_name, requested_device):
    try:
        load_model(model_name, requested_device)
    except EOFError as exc:
        STATE["status"] = "error"
        STATE["error"] = (
            "XTTS 首次下载需要确认 Coqui CPML / 商业授权。"
            "如果你已确认接受，请使用 COQUI_TOS_AGREED=1 或 XTTS_ACCEPT_CPML=1 重新启动。"
        )
        STATE["device"] = None
        STATE["model_name"] = model_name
        STATE["tts"] = None
        log(f"{type(exc).__name__}: {exc}")
        traceback.print_exc()
    except Exception as exc:
        STATE["status"] = "error"
        STATE["error"] = f"{type(exc).__name__}: {exc}"
        STATE["device"] = None
        STATE["model_name"] = model_name
        STATE["tts"] = None
        log(STATE["error"])
        traceback.print_exc()


def send_json(handler, status_code, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status_code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def send_audio(handler, audio_bytes):
    handler.send_response(200)
    handler.send_header("Content-Type", "audio/wav")
    handler.send_header("Content-Length", str(len(audio_bytes)))
    handler.end_headers()
    handler.wfile.write(audio_bytes)


def read_json_body(handler):
    raw_length = handler.headers.get("Content-Length", "0").strip()
    try:
        content_length = int(raw_length)
    except ValueError:
        content_length = 0

    body = handler.rfile.read(content_length) if content_length > 0 else b"{}"
    if not body:
        return {}
    return json.loads(body.decode("utf-8"))


def resolve_local_reference(candidate, speakers_dir):
    raw = str(candidate or "").strip()
    if not raw:
        return None

    if raw.startswith("/assets/"):
        local = PUBLIC_DIR / raw.lstrip("/")
    else:
        local = Path(raw).expanduser()
        if not local.is_absolute():
            local = (Path.cwd() / local).resolve()

    if local.exists():
        return local

    voice_alias = raw.replace("\\", "/").split("/")[-1]
    voice_alias = voice_alias.rsplit(".", 1)[0]
    for ext in (".wav", ".mp3", ".m4a", ".flac", ".ogg"):
        alias_path = speakers_dir / f"{voice_alias}{ext}"
        if alias_path.exists():
            return alias_path

    return None


def download_reference(url):
    suffix = Path(url.split("?", 1)[0]).suffix or ".wav"
    temp_dir = Path(tempfile.mkdtemp(prefix="xtts-ref-"))
    target = temp_dir / f"reference{suffix}"
    with urllib.request.urlopen(url) as response, open(target, "wb") as output_file:
        shutil.copyfileobj(response, output_file)
    return target, temp_dir


def resolve_reference_audio(payload, speakers_dir):
    cleanup_dirs = []
    reference_url = str(payload.get("reference_url") or payload.get("referenceUrl") or "").strip()
    voice_alias = str(payload.get("voice") or payload.get("speaker") or "").strip()

    if reference_url.startswith("http://") or reference_url.startswith("https://"):
        local_file, temp_dir = download_reference(reference_url)
        cleanup_dirs.append(temp_dir)
        return local_file, cleanup_dirs

    local_reference = resolve_local_reference(reference_url, speakers_dir)
    if local_reference:
        return local_reference, cleanup_dirs

    alias_reference = resolve_local_reference(voice_alias, speakers_dir)
    if alias_reference:
        return alias_reference, cleanup_dirs

    return None, cleanup_dirs


def apply_speed_if_needed(source_path, speed):
    try:
        normalized_speed = float(speed)
    except (TypeError, ValueError):
        normalized_speed = 1.0

    if abs(normalized_speed - 1.0) < 0.001:
        return source_path

    normalized_speed = max(0.5, min(2.0, normalized_speed))
    output_path = source_path.with_name(f"{source_path.stem}-atempo.wav")
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(source_path),
        "-filter:a",
        f"atempo={normalized_speed}",
        str(output_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True, cwd=PROJECT_ROOT)
    if result.returncode != 0:
        detail = "\n".join(item for item in [result.stdout, result.stderr] if item).strip()
        raise RuntimeError(f"ffmpeg speed adjust failed: {detail or result.returncode}")

    return output_path


class XTTSRequestHandler(BaseHTTPRequestHandler):
    server_version = "XTTSHTTP/1.0"

    def log_message(self, format_, *args):
        log(format_ % args)

    def do_GET(self):
        if self.path != "/health":
            send_json(self, 404, {"status": "error", "message": "not found"})
            return

        payload = {
          "status": STATE["status"],
          "engine": "xtts",
          "model": STATE["model_name"],
          "device": STATE["device"],
          "speakers_dir": str(self.server.speakers_dir),
          "error": STATE["error"],
        }
        send_json(self, 200 if STATE["status"] == "ok" else 503, payload)

    def do_POST(self):
        if self.path != "/synthesize":
            send_json(self, 404, {"status": "error", "message": "not found"})
            return

        if STATE["status"] != "ok" or STATE["tts"] is None:
            send_json(self, 503, {"status": "error", "message": STATE["error"] or "model not ready"})
            return

        try:
            payload = read_json_body(self)
            text = str(payload.get("text") or "").strip()
            if not text:
                send_json(self, 400, {"status": "error", "message": "text is required"})
                return

            language = normalize_language(payload.get("language"))
            speed = payload.get("speed", 1.0)
            reference_audio, cleanup_dirs = resolve_reference_audio(payload, self.server.speakers_dir)
            if reference_audio is None:
                send_json(
                    self,
                    400,
                    {
                        "status": "error",
                        "message": "xtts requires reference_url or a matching speaker alias file in runtime/voices/xtts",
                    },
                )
                return

            work_dir = Path(tempfile.mkdtemp(prefix="xtts-out-"))
            cleanup_dirs.append(work_dir)
            raw_output = work_dir / "synth.wav"

            with MODEL_LOCK:
                synthesize_to_file(text, reference_audio, language, raw_output)

            final_output = apply_speed_if_needed(raw_output, speed)
            with open(final_output, "rb") as audio_file:
                audio_bytes = audio_file.read()

            send_audio(self, audio_bytes)
        except Exception as exc:
            detail = f"{type(exc).__name__}: {exc}"
            traceback.print_exc()
            send_json(self, 500, {"status": "error", "message": detail})
        finally:
            for directory in locals().get("cleanup_dirs", []):
                shutil.rmtree(directory, ignore_errors=True)


def build_argument_parser():
    parser = argparse.ArgumentParser(description="Local XTTS-v2 HTTP server for Remotion workflow")
    parser.add_argument("--host", default=os.getenv("XTTS_HOST", "127.0.0.1"))
    parser.add_argument("--port", default=int(os.getenv("XTTS_PORT", "18083")), type=int)
    parser.add_argument("--device", default=os.getenv("XTTS_DEVICE", "auto"))
    parser.add_argument("--model", default=os.getenv("XTTS_MODEL_NAME", DEFAULT_MODEL))
    parser.add_argument(
        "--speakers-dir",
        default=os.getenv("XTTS_SPEAKERS_DIR", str(DEFAULT_SPEAKERS_DIR)),
    )
    return parser


def main():
    args = build_argument_parser().parse_args()
    speakers_dir = Path(args.speakers_dir).expanduser().resolve()
    speakers_dir.mkdir(parents=True, exist_ok=True)

    try_load_model(args.model, args.device)

    server = ThreadingHTTPServer((args.host, args.port), XTTSRequestHandler)
    server.speakers_dir = speakers_dir
    log(f"listening on http://{args.host}:{args.port}")
    log(f"speakers_dir={speakers_dir}")
    server.serve_forever()


if __name__ == "__main__":
    main()
