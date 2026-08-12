#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/app.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No PID file found."
  exit 0
fi

APP_PID="$(cat "$PID_FILE")"
if kill -0 "$APP_PID" 2>/dev/null; then
  kill "$APP_PID"
  echo "Stopped application with PID $APP_PID"
else
  echo "Process $APP_PID is not running."
fi

rm -f "$PID_FILE"
