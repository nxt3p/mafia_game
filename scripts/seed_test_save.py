#!/usr/bin/env python3
"""Ensure mid-game save JSON exists for UI audits."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests" / "fixtures" / "midgame-save.json"
NODE_SEED = ROOT / "scripts" / "seed-test-save.js"


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if NODE_SEED.is_file():
        subprocess.run(["node", str(NODE_SEED)], cwd=ROOT, check=True)
        return
    print("Missing seed-test-save.js", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
