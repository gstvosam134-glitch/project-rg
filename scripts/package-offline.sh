#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="$(node -p "require('$ROOT/package.json').name")"
DIST="$ROOT/dist"
BUNDLE="$DIST/$NAME-offline"

if [[ ! -d "$ROOT/node_modules" ]]; then
  echo "node_modules not found. Run npm ci or npm install on an online build machine first." >&2
  exit 1
fi

rm -rf "$BUNDLE"
mkdir -p "$BUNDLE/logs"

for item in package.json package-lock.json node_modules src views public scripts data .env.example 离线安装部署文档.md; do
  if [[ -e "$ROOT/$item" ]]; then
    cp -a "$ROOT/$item" "$BUNDLE/"
  fi
done

if [[ ! -f "$BUNDLE/离线安装部署文档.md" ]]; then
  cat > "$BUNDLE/离线安装部署文档.md" <<'EOF'
# Offline Deployment

1. Copy `.env.example` to `.env` and edit settings.
2. Run final environment verification: `scripts\verify-environment.bat` or `./scripts/verify-environment.sh`.
3. Start on Windows: `scripts\start-background.bat`.
4. Stop on Windows: `scripts\stop-background.bat`.
5. Start on Linux: `chmod +x scripts/*.sh && ./scripts/start-background.sh`.
6. Stop on Linux: `./scripts/stop-background.sh`.

Backend exception logs are written to `logs/error.log`.
EOF
fi

tar -czf "$DIST/$NAME-offline.tar.gz" -C "$DIST" "$NAME-offline"
echo "Created $BUNDLE and $NAME-offline.tar.gz"
