#!/usr/bin/env python3
"""Serve the crawler builder's dist/ directory over HTTP.

Run this from anywhere:
    python serve.py

The server always resolves dist/ relative to this file, so the site does not
break just because the shell's current working directory is different.
"""
from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST_DIR = ROOT / "dist"


class CrawlerRequestHandler(SimpleHTTPRequestHandler):
    """Static handler pinned to the project's dist directory."""

    def end_headers(self) -> None:
        # Avoid stale JS/PDF assets while iterating locally.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def make_server(bind: str = "127.0.0.1", port: int = 4173) -> ThreadingHTTPServer:
    if not (DIST_DIR / "index.html").is_file():
        raise FileNotFoundError(f"Missing site entry point: {DIST_DIR / 'index.html'}")

    handler = partial(CrawlerRequestHandler, directory=str(DIST_DIR))
    return ThreadingHTTPServer((bind, port), handler)


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the Dungeon Crawler Carl character builder.")
    parser.add_argument("--bind", default="127.0.0.1", help="Address to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=4173, help="Port to use (default: 4173)")
    args = parser.parse_args()

    server = make_server(args.bind, args.port)
    host, port = server.server_address[:2]
    display_host = "localhost" if host in {"127.0.0.1", "::1"} else host
    print(f"Serving {DIST_DIR}")
    print(f"Open http://{display_host}:{port}/")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
