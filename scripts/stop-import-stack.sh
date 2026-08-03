#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEFAULT_WEB_ROOT="$(cd "$ROOT/../HomeRecipe/AI-Recipe-App/HomeRecipe" 2>/dev/null && pwd || true)"
export HOMERECIPE_WEB_ROOT="${HOMERECIPE_WEB_ROOT:-$DEFAULT_WEB_ROOT}"

docker compose -f "$ROOT/docker-compose.yml" down
echo "Import stack stopped."
