#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/app.pid"
LOG_DIR="$ROOT/logs"
LOG_FILE="$LOG_DIR/app.log"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Application is already running with PID $(cat "$PID_FILE")"
  exit 0
fi

mkdir -p "$LOG_DIR"
cd "$ROOT"
nohup node src/server.js >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
echo "Started application with PID $(cat "$PID_FILE")"
