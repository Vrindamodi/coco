#!/usr/bin/env bash
# Starts the on-device AI stack used when AI_PROVIDER=local, so the voice
# chatbot works with no internet connection (demo mode).
#
#   whisper.cpp server  -> speech to text  (Metal-accelerated, port 8081)
#   Ollama              -> chat LLM        (port 11434)
#
# One-time setup (needs internet once):
#   brew install whisper-cpp ollama ffmpeg
#   scripts/offline-ai.sh --setup      # downloads the two models (~6 GB)
#
# Every demo:
#   scripts/offline-ai.sh              # starts both servers, Ctrl-C stops them
#   AI_PROVIDER=local docker compose up backend
set -euo pipefail

WHISPER_MODEL_DIR="${WHISPER_MODEL_DIR:-$HOME/.cache/whisper-cpp}"
WHISPER_MODEL="${WHISPER_MODEL:-ggml-large-v3.bin}"
WHISPER_PORT="${WHISPER_PORT:-8081}"
LLM_MODEL="${LOCAL_LLM_MODEL:-gemma3:4b}"
MODEL_PATH="$WHISPER_MODEL_DIR/$WHISPER_MODEL"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing '$1'. Install with: brew install $2" >&2
    exit 1
  fi
}

need whisper-server whisper-cpp
need ollama ollama
# whisper.cpp only decodes WAV itself; ffmpeg converts the phone's m4a clips.
need ffmpeg ffmpeg

ollama_running() {
  curl -fsS "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1
}

STARTED_OLLAMA=0
ensure_ollama() {
  if ! ollama_running; then
    echo "Starting Ollama..."
    ollama serve >/tmp/coco-ollama.log 2>&1 &
    STARTED_OLLAMA=1
    for _ in $(seq 1 30); do
      ollama_running && break
      sleep 1
    done
    ollama_running || { echo "Ollama did not start; see /tmp/coco-ollama.log" >&2; exit 1; }
  fi
}

if [[ "${1:-}" == "--setup" ]]; then
  mkdir -p "$WHISPER_MODEL_DIR"
  if [[ ! -f "$MODEL_PATH" ]]; then
    echo "Downloading $WHISPER_MODEL (about 3 GB)..."
    curl -L --fail --retry 3 -o "$MODEL_PATH.part" \
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$WHISPER_MODEL"
    mv "$MODEL_PATH.part" "$MODEL_PATH"
  fi
  ensure_ollama
  echo "Pulling $LLM_MODEL..."
  ollama pull "$LLM_MODEL"
  echo "Setup complete."
  exit 0
fi

if [[ ! -f "$MODEL_PATH" ]]; then
  echo "Whisper model not found at $MODEL_PATH. Run: scripts/offline-ai.sh --setup" >&2
  exit 1
fi

ensure_ollama
if ! ollama list 2>/dev/null | grep -q "^${LLM_MODEL%%:*}"; then
  echo "Model $LLM_MODEL is not pulled. Run: scripts/offline-ai.sh --setup" >&2
  exit 1
fi

# Load the chat model into memory now so the first reply is not the slow one.
ollama run "$LLM_MODEL" "" >/dev/null 2>&1 || true

cleanup() {
  echo
  echo "Stopping local AI..."
  [[ -n "${WHISPER_PID:-}" ]] && kill "$WHISPER_PID" 2>/dev/null || true
  if [[ "$STARTED_OLLAMA" == "1" ]]; then
    pkill -f "ollama serve" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting whisper.cpp server on port $WHISPER_PORT with $WHISPER_MODEL..."
whisper-server \
  --model "$MODEL_PATH" \
  --host 0.0.0.0 \
  --port "$WHISPER_PORT" \
  --convert \
  --threads "${WHISPER_THREADS:-8}" &
WHISPER_PID=$!

echo
echo "Local AI is up:"
echo "  speech to text  http://localhost:$WHISPER_PORT/inference"
echo "  chat            http://localhost:11434/v1/chat/completions ($LLM_MODEL)"
echo
echo "Now run the backend with:  AI_PROVIDER=local docker compose up backend"
echo "Press Ctrl-C to stop."
wait "$WHISPER_PID"
