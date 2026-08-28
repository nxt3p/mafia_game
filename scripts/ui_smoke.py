#!/usr/bin/env python3
"""Headless UI smoke — nav groups + all 14 tabs render (no browser)."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SMOKE_JS = ROOT / "scripts" / "ui-smoke.js"


def main() -> None:
    if not SMOKE_JS.is_file():
        print("Missing ui-smoke.js", file=sys.stderr)
        sys.exit(1)
    subprocess.run(["node", str(SMOKE_JS)], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
