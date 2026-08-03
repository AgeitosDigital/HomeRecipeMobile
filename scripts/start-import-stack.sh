#!/usr/bin/env bash
# Start the recipe URL import Docker service used by the local web BFF
# (which the mobile app calls via EXPO_PUBLIC_APP_URL).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEFAULT_WEB_ROOT="$(cd "$ROOT/../HomeRecipe/AI-Recipe-App/HomeRecipe" 2>/dev/null && pwd || true)"
WEB_ROOT="${HOMERECIPE_WEB_ROOT:-$DEFAULT_WEB_ROOT}"

if [[ -z "$WEB_ROOT" || ! -f "$WEB_ROOT/services/recipe-url-import/Dockerfile" ]]; then
  echo "error: cannot find web recipe-url-import service."
  echo "  Expected Dockerfile at:"
  echo "    <web>/services/recipe-url-import/Dockerfile"
  echo "  Set HOMERECIPE_WEB_ROOT to your HomeRecipe web checkout, e.g.:"
  echo "    export HOMERECIPE_WEB_ROOT=\"\$HOME/Documents/HomeRecipe/AI-Recipe-App/HomeRecipe\""
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker not found. Install Docker Desktop and ensure 'docker' is on PATH."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "error: Docker daemon is not running. Open Docker Desktop and wait until it is ready."
  exit 1
fi

export HOMERECIPE_WEB_ROOT="$WEB_ROOT"
echo "Using web root: $HOMERECIPE_WEB_ROOT"
echo "Starting recipe-url-import on http://localhost:8000 …"
docker compose -f "$ROOT/docker-compose.yml" up --build -d recipe-url-import

echo ""
echo "Waiting for import API health…"
ready=0
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:8000/docs" >/dev/null 2>&1 \
    || curl -sf "http://127.0.0.1:8000/health" >/dev/null 2>&1 \
    || curl -sf "http://127.0.0.1:8000/" >/dev/null 2>&1; then
    ready=1
    break
  fi
  # Some FastAPI apps only expose /import-url; treat open TCP as enough after a few tries
  if (echo >/dev/tcp/127.0.0.1/8000) >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" -eq 1 ]]; then
  echo "✓ Import service is up on :8000"
else
  echo "warning: could not confirm HTTP on :8000 yet — check: docker compose logs -f recipe-url-import"
fi

echo ""
echo "Next steps for mobile Import URL:"
echo "  1. In the web repo (next-app), run:  npm run dev   (http://localhost:3000)"
echo "  2. Mobile .env.local must have:     EXPO_PUBLIC_APP_URL=http://localhost:3000"
echo "  3. Start Expo:                     npx expo start   → open iOS Simulator"
echo "  4. Sign in, then use Import recipe with a recipe URL"
echo ""
echo "Stop with:  npm run import:down"
