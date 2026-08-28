#!/usr/bin/env python3
"""
Screenshot all game tabs at desktop + mobile viewports using Playwright (Python venv).
No sudo: browsers install to user cache via `playwright install chromium`.
If bundled Chromium fails (missing libnspr4), tries system Chrome/Edge via channel.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAVE_PATH = ROOT / "tests" / "fixtures" / "midgame-save.json"
OUT_DIR = ROOT / "tests" / "screenshots"
BASE_URL = os.environ.get("MOB_EMPIRE_URL", "http://127.0.0.1:8080")

TABS = [
    "dashboard", "quests", "heists", "properties", "crew", "army",
    "crafting", "prestige", "arena", "climb", "bosses", "hideout", "shop", "character",
]

VIEWPORTS = {
    "desktop": {"width": 1280, "height": 800},
    "mobile": {"width": 390, "height": 844},
}


def ensure_browser_libs() -> None:
    """Extract Chromium .so deps via apt download (no sudo). Sets LD_LIBRARY_PATH."""
    lib_root = ROOT / ".local-libs" / "usr" / "lib" / "x86_64-linux-gnu"
    marker = lib_root / "libnspr4.so"
    if not marker.is_file():
        print("Fetching browser libraries (apt download, no sudo) ...")
        fetch_dir = ROOT / ".local-libs-fetch"
        fetch_dir.mkdir(parents=True, exist_ok=True)
        pkgs = ["libnspr4", "libnss3", "libasound2t64"]
        subprocess.run(
            ["apt", "download", *pkgs],
            cwd=fetch_dir,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        extract_root = ROOT / ".local-libs"
        if extract_root.exists():
            import shutil
            shutil.rmtree(extract_root)
        extract_root.mkdir(parents=True)
        for deb in fetch_dir.glob("*.deb"):
            subprocess.run(
                ["dpkg-deb", "-x", str(deb), str(extract_root)],
                check=True,
            )
    lib_path = str(lib_root)
    prev = os.environ.get("LD_LIBRARY_PATH", "")
    os.environ["LD_LIBRARY_PATH"] = lib_path + (":" + prev if prev else "")


def ensure_save() -> None:
    if SAVE_PATH.is_file():
        return
    seed = ROOT / "scripts" / "seed_test_save.py"
    subprocess.run([sys.executable, str(seed)], cwd=ROOT, check=True)


def ensure_server() -> subprocess.Popen | None:
    try:
        with urllib.request.urlopen(BASE_URL + "/", timeout=2) as r:
            if r.status == 200:
                return None
    except (urllib.error.URLError, TimeoutError):
        pass
    print(f"Starting server on {BASE_URL} ...")
    proc = subprocess.Popen(
        [sys.executable, str(ROOT / "serve.py"), "--no-open", "-p", "8080"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(30):
        try:
            with urllib.request.urlopen(BASE_URL + "/", timeout=1) as r:
                if r.status == 200:
                    return proc
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.2)
    proc.kill()
    raise RuntimeError("Could not start serve.py on port 8080")


def launch_browser(playwright):
    channel = os.environ.get("PLAYWRIGHT_CHANNEL", "").strip()
    if channel:
        return playwright.chromium.launch(channel=channel, headless=True)
    try:
        return playwright.chromium.launch(headless=True)
    except Exception as e:
        print(f"Bundled Chromium failed ({e}). Trying system Chrome ...")
        for ch in ("chrome", "msedge", "chromium"):
            try:
                print(f"  channel={ch}")
                return playwright.chromium.launch(channel=ch, headless=True)
            except Exception:
                continue
        raise RuntimeError(
            "No browser available. Run: python -m playwright install chromium\n"
            "Or set PLAYWRIGHT_CHANNEL=chrome if Chrome is installed.\n"
            "Fallback (no browser): node scripts/ui-smoke.js"
        ) from e


def run_audit() -> None:
    from playwright.sync_api import sync_playwright

    ensure_browser_libs()
    ensure_save()
    save_json = SAVE_PATH.read_text(encoding="utf-8")
    server = ensure_server()

    try:
        with sync_playwright() as p:
            browser = launch_browser(p)
            try:
                for name, vp in VIEWPORTS.items():
                    context = browser.new_context(viewport=vp)
                    page = context.new_page()
                    page.add_init_script(
                        f"localStorage.setItem('mob_empire_save_v6', {json.dumps(save_json)});"
                    )
                    page.goto(BASE_URL + "/")
                    page.wait_for_function("window.__gameLoaded === true", timeout=15000)
                    page.wait_for_selector("#content .card", timeout=15000)

                    dest = OUT_DIR / name
                    dest.mkdir(parents=True, exist_ok=True)

                    for tab in TABS:
                        page.evaluate("(t) => window.switchTab(t)", tab)
                        page.wait_for_selector("#content .card")
                        page.wait_for_timeout(300)
                        page.screenshot(path=str(dest / f"{tab}.png"), full_page=True)
                        print(f"  [{name}] {tab}.png")

                    context.close()
            finally:
                browser.close()
    finally:
        if server is not None:
            server.terminate()
            server.wait(timeout=5)

    print(f"\nScreenshots saved under {OUT_DIR}/")


def main() -> None:
    try:
        run_audit()
    except ImportError:
        print(
            "Playwright not installed. Run:\n"
            "  bash scripts/setup_dev.sh\n"
            "  source .venv/bin/activate",
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
