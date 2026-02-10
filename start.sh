#!/usr/bin/env bash
set -euo pipefail

# Always run relative to the script location (important)
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  Rackbase - Starting Servers"
echo "========================================"
echo ""

# Load .env
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BACKEND_PORT="${BACKEND_PORT:-8088}"
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
FRONTEND_PORT="${FRONTEND_PORT:-3036}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"

# Checks
command -v python3 >/dev/null || { echo "ERROR: python3 not found"; exit 1; }
command -v node >/dev/null    || { echo "ERROR: node not found"; exit 1; }
command -v npm >/dev/null     || { echo "ERROR: npm not found"; exit 1; }

echo "Python:  $(python3 --version)"
echo "Node:    $(node --version)"
echo "npm:     $(npm --version)"
echo ""

echo "Configuration:"
echo "  Backend:  ${BACKEND_HOST}:${BACKEND_PORT}"
echo "  Frontend: ${FRONTEND_HOST}:${FRONTEND_PORT}"
echo ""

mkdir -p logs
BACKEND_LOG="logs/backend.log"
FRONTEND_LOG="logs/frontend.log"

BACKEND_PID=""
FRONTEND_PID=""

shutdown() {
  echo ""
  echo "Stopping servers..."
  [[ -n "${BACKEND_PID}" ]] && kill "${BACKEND_PID}" 2>/dev/null || true
  [[ -n "${FRONTEND_PID}" ]] && kill "${FRONTEND_PID}" 2>/dev/null || true
  echo "Servers stopped."
}
trap shutdown INT TERM EXIT

echo "Starting Backend Server..."
python3 -m uvicorn main:app --reload --port "${BACKEND_PORT}" --host "${BACKEND_HOST}" \
  >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

# Frontend
if [[ ! -d frontend ]]; then
  echo "ERROR: ./frontend directory not found (current dir: $PWD)"
  exit 1
fi

echo "Starting Frontend Server..."
pushd frontend >/dev/null

# Optional: ensure deps are installed (comment out if you hate it)
if [[ ! -d node_modules ]]; then
  echo "frontend/node_modules missing -> running npm install"
  npm install >>"$SCRIPT_DIR/$FRONTEND_LOG" 2>&1
fi

# Start dev server
npm run dev -- --port "${FRONTEND_PORT}" --hostname "${FRONTEND_HOST}" \
  >>"$SCRIPT_DIR/$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

popd >/dev/null

# Give it a moment, then verify it didn't instantly exit
sleep 1
if ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
  echo "ERROR: Frontend failed to start. Check: ${FRONTEND_LOG}"
  echo "Last 50 lines:"
  tail -n 50 "${FRONTEND_LOG}" || true
  exit 1
fi

echo ""
echo "========================================"
echo "  Servers Started!"
echo "========================================"
echo ""
echo "Backend:  http://localhost:${BACKEND_PORT}"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo ""
echo "Logs:"
echo "  ${BACKEND_LOG}"
echo "  ${FRONTEND_LOG}"
echo ""
echo "Press Ctrl+C to stop..."
echo ""

wait -n "${BACKEND_PID}" "${FRONTEND_PID}"