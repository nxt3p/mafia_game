#!/usr/bin/env python3
"""Serve Mob Empire locally on http://localhost:8080"""

from __future__ import annotations

import argparse
import atexit
import functools
import http.server
import os
import signal
import socket
import socketserver
import subprocess
import sys
import webbrowser

HOST = "127.0.0.1"
PORT = 8080
ROOT = os.path.dirname(os.path.abspath(__file__))
PID_FILE = os.path.join(ROOT, ".serve.pid")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))


def write_pid() -> None:
    with open(PID_FILE, "w", encoding="utf-8") as f:
        f.write(str(os.getpid()))


def clear_pid() -> None:
    try:
        if os.path.isfile(PID_FILE):
            with open(PID_FILE, encoding="utf-8") as f:
                if f.read().strip() == str(os.getpid()):
                    os.remove(PID_FILE)
    except OSError:
        pass


def read_pid() -> int | None:
    try:
        with open(PID_FILE, encoding="utf-8") as f:
            return int(f.read().strip())
    except (OSError, ValueError):
        return None


def pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def find_listener_pids(host: str, port: int) -> list[int]:
    """Best-effort: find PIDs listening on host:port via ss (Linux)."""
    import re

    pids: list[int] = []
    try:
        out = subprocess.check_output(
            ["ss", "-ltnp", f"sport = :{port}"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
        for match in re.finditer(r"pid=(\d+)", out):
            pids.append(int(match.group(1)))
    except (OSError, subprocess.CalledProcessError, FileNotFoundError):
        pass
    seen: set[int] = set()
    uniq: list[int] = []
    for p in pids:
        if p not in seen:
            seen.add(p)
            uniq.append(p)
    return uniq


def stop_server(host: str, port: int) -> int:
    targets: list[int] = []
    pid = read_pid()
    if pid and pid_alive(pid):
        targets.append(pid)
    for p in find_listener_pids(host, port):
        if p not in targets:
            targets.append(p)

    if not targets:
        if os.path.isfile(PID_FILE):
            try:
                os.remove(PID_FILE)
            except OSError:
                pass
        print(f"No Mob Empire server found on {host}:{port}.")
        return 1

    stopped = False
    for p in targets:
        try:
            os.kill(p, signal.SIGTERM)
            print(f"Stopped server (pid {p}).")
            stopped = True
        except OSError as e:
            print(f"Could not stop pid {p}: {e}", file=sys.stderr)

    try:
        if os.path.isfile(PID_FILE):
            os.remove(PID_FILE)
    except OSError:
        pass

    return 0 if stopped else 1


def port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind((host, port))
            return False
        except OSError:
            return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve Mob Empire in your browser.")
    parser.add_argument("-p", "--port", type=int, default=PORT, help=f"Port (default: {PORT})")
    parser.add_argument("--host", default=HOST, help=f"Bind address (default: {HOST})")
    parser.add_argument("--no-open", action="store_true", help="Don't open a browser tab")
    parser.add_argument("--stop", action="store_true", help="Stop a running Mob Empire server")
    args = parser.parse_args()

    if args.stop:
        sys.exit(stop_server(args.host, args.port))

    if port_in_use(args.host, args.port):
        print(
            f"Port {args.port} is already in use. "
            f"Stop it with: python3 serve.py --stop -p {args.port}",
            file=sys.stderr,
        )
        sys.exit(1)

    os.chdir(ROOT)
    handler = functools.partial(QuietHandler, directory=ROOT)
    url = f"http://{args.host}:{args.port}/"

    socketserver.TCPServer.allow_reuse_address = True
    write_pid()
    atexit.register(clear_pid)

    with socketserver.TCPServer((args.host, args.port), handler) as httpd:
        print(f"Mob Empire serving at {url}")
        print("Press Ctrl+C to stop, or run: python3 serve.py --stop")
        if not args.no_open:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
        finally:
            clear_pid()


if __name__ == "__main__":
    main()
