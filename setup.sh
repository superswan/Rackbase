#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  Rackbase - Setup"
echo "========================================"
echo ""

PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "ERROR: Python not found in PATH"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found in PATH"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found in PATH"
  exit 1
fi

echo "Python: $($PYTHON_BIN --version)"
echo "Node:   $(node --version)"
echo "npm:    $(npm --version)"
echo ""

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
else
  echo "Found existing .env"
fi

get_env_value() {
  local key="$1"
  local default="$2"
  if [[ -f .env ]]; then
    local value
    value=$(grep -E "^${key}=" .env | tail -n 1 | cut -d= -f2- || true)
    if [[ -n "$value" ]]; then
      echo "$value"
      return
    fi
  fi
  echo "$default"
}

get_local_ip() {
  local ip=""
  if command -v hostname >/dev/null 2>&1; then
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi
  if [[ -z "$ip" ]] && command -v ipconfig >/dev/null 2>&1; then
    ip=$(ipconfig getifaddr en0 2>/dev/null || true)
  fi
  if [[ -z "$ip" ]] && command -v ip >/dev/null 2>&1; then
    ip=$(ip -4 addr show scope global 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | head -n 1)
  fi
  echo "$ip"
}

read -rp "Expose services on LAN? [y/N] " LAN_CHOICE
if [[ "${LAN_CHOICE}" =~ ^[Yy]$ ]]; then
  BACKEND_PORT="$(get_env_value BACKEND_PORT 8088)"
  FRONTEND_PORT="$(get_env_value FRONTEND_PORT 3036)"
  LAN_IP="$(get_local_ip)"

  if [[ -z "$LAN_IP" ]]; then
    read -rp "Enter the LAN IP to use (e.g. 192.168.1.50): " LAN_IP
  fi

  if [[ -z "$LAN_IP" ]]; then
    echo "ERROR: No LAN IP provided"
    exit 1
  fi

  CORS_ORIGINS="http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT},http://${LAN_IP}:${FRONTEND_PORT}"

  export LAN_IP BACKEND_PORT FRONTEND_PORT CORS_ORIGINS
  "$PYTHON_BIN" - <<'PY'
from pathlib import Path
import os
import re

path = Path(".env")
text = path.read_text()

def set_key(contents: str, key: str, value: str) -> str:
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    line = f"{key}={value}"
    if pattern.search(contents):
        return pattern.sub(line, contents)
    return contents.rstrip() + "\n" + line + "\n"

lan_ip = os.environ["LAN_IP"]
backend_port = os.environ["BACKEND_PORT"]
cors = os.environ["CORS_ORIGINS"]

text = set_key(text, "BACKEND_HOST", "0.0.0.0")
text = set_key(text, "FRONTEND_HOST", "0.0.0.0")
text = set_key(text, "NEXT_PUBLIC_API_URL", f"http://{lan_ip}:{backend_port}")
text = set_key(text, "CORS_ORIGINS", cors)

path.write_text(text)
PY

  echo "Configured .env for LAN access using ${LAN_IP}"
fi

echo ""
echo "Installing backend dependencies..."
if [[ -d .venv ]]; then
  echo "Using existing .venv"
  VENV_PYTHON=".venv/bin/python"
else
  if "$PYTHON_BIN" -m pip --version >/dev/null 2>&1; then
    if "$PYTHON_BIN" -m pip install -r requirements.txt >/dev/null 2>&1; then
      echo "Installed backend dependencies system-wide"
      VENV_PYTHON=""
    else
      "$PYTHON_BIN" -m venv .venv
      VENV_PYTHON=".venv/bin/python"
    fi
  else
    "$PYTHON_BIN" -m venv .venv
    VENV_PYTHON=".venv/bin/python"
  fi
fi

if [[ -n "${VENV_PYTHON:-}" ]]; then
  "${VENV_PYTHON}" -m pip install --upgrade pip
  "${VENV_PYTHON}" -m pip install -r requirements.txt
fi

echo ""
echo "Installing frontend dependencies..."
pushd frontend >/dev/null
npm install
popd >/dev/null

echo ""
echo "Setup complete. You can now start the servers using start.sh/start.ps1/start.bat."
