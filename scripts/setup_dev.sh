#!/usr/bin/env bash
# Bootstrap dev venv (Playwright + UI audit). No sudo required.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required" >&2
  exit 1
fi

bootstrap_pip() {
  local py="$1"
  if "$py" -m pip --version >/dev/null 2>&1; then
    return 0
  fi
  echo "Bootstrapping pip (ensurepip unavailable, no sudo needed) ..."
  local tmp
  tmp="$(mktemp)"
  curl -sS https://bootstrap.pypa.io/get-pip.py -o "$tmp"
  "$py" "$tmp"
  rm -f "$tmp"
}

fetch_browser_libs() {
  local fetch="$ROOT/.local-libs-fetch"
  mkdir -p "$fetch"
  if apt download -o Dir::Cache::archives="$fetch" libnspr4 libnss3 libasound2t64; then
    rm -rf "$ROOT/.local-libs"
    mkdir -p "$ROOT/.local-libs"
    for deb in "$fetch"/*.deb; do
      [ -f "$deb" ] && dpkg-deb -x "$deb" "$ROOT/.local-libs"
    done
    echo "Browser libs extracted to .local-libs/"
  else
    echo "Note: could not fetch browser libs; try PLAYWRIGHT_CHANNEL=chrome"
  fi
}

if [ ! -d .venv ]; then
  echo "Creating .venv ..."
  if ! python3 -m venv .venv 2>/dev/null; then
    rm -rf .venv
    python3 -m venv .venv --without-pip
    bootstrap_pip "$ROOT/.venv/bin/python"
  fi
fi

PY="$ROOT/.venv/bin/python"
PIP="$ROOT/.venv/bin/pip"

bootstrap_pip "$PY"

"$PIP" install -U pip wheel
"$PIP" install -r requirements-dev.txt

echo "Installing Playwright Chromium (user cache, no sudo) ..."
"$PY" -m playwright install chromium

if [ ! -f "$ROOT/.local-libs/usr/lib/x86_64-linux-gnu/libnspr4.so" ]; then
  echo "Fetching Linux browser libs via apt download (no sudo) ..."
  fetch_browser_libs
fi

echo ""
echo "Dev venv ready. Activate with:"
echo "  source .venv/bin/activate"
echo ""
echo "Then run:"
echo "  python scripts/run_ui_audit.py"
echo "  python scripts/ui_smoke.py          # no browser"
echo "  node scripts/ui-smoke.js            # optional Node smoke"
