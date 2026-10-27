#!/usr/bin/env python3
"""Browser acceptance smoke tests for the VTG static site.

Runs against the exact checked-out commit served locally in CI. API-backed actions
are intentionally not submitted; live Railway/API acceptance is a separate stage.
"""
from __future__ import annotations

import http.server
import os
import socketserver
import subprocess
import threading
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PORT = int(os.environ.get("VTG_TEST_PORT", "4173"))
BASE = f"http://127.0.0.1:{PORT}"
ROUTES = [
    "/frontend-v3.html",
    "/marketplace.html",
    "/supplier-dashboard.html",
    "/buyer-dashboard.html",
    "/bank-trade-os.html",
    "/trade-atlas.html",
    "/vtg-ai.html",
]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main() -> int:
    server = Server(("127.0.0.1", PORT), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.25)

    failures: list[str] = []
    passed = 0
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            desktop = browser.new_context(viewport={"width": 1365, "height": 900})
            page = desktop.new_page()
            page_errors: list[str] = []
            bad_local_assets: list[str] = []
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            page.on(
                "requestfailed",
                lambda request: bad_local_assets.append(request.url)
                if request.url.startswith(BASE + "/") and "/api/" not in request.url
                else None,
            )

            for route in ROUTES:
                page_errors.clear()
                bad_local_assets.clear()
                try:
                    response = page.goto(BASE + route, wait_until="domcontentloaded", timeout=20000)
                    page.wait_for_timeout(500)
                    title = page.title().strip()
                    body = page.locator("body").inner_text(timeout=5000).strip()
                    assert response is not None and response.status == 200, f"HTTP status: {response.status if response else 'no response'}"
                    assert title, "document title is empty"
                    assert len(body) >= 20, "page body is unexpectedly empty"
                    assert not page_errors, "uncaught JavaScript error(s): " + " | ".join(page_errors[:3])
                    assert not bad_local_assets, "failed local asset request(s): " + " | ".join(bad_local_assets[:3])
                    print(f"PASS route {route} — {title}")
                    passed += 1
                except Exception as exc:
                    failures.append(f"{route}: {exc}")
                    print(f"FAIL route {route}: {exc}")

            # Exercise real controls on the supplier workspace without submitting data.
            try:
                page.goto(BASE + "/supplier-dashboard.html", wait_until="domcontentloaded", timeout=20000)
                theme = page.locator("#themeToggle")
                assert theme.count() == 1, "supplier theme toggle is missing"
                before = page.locator("html").get_attribute("data-theme")
                theme.click()
                page.wait_for_timeout(150)
                after = page.locator("html").get_attribute("data-theme")
                assert before != after, f"theme toggle did not change theme ({before!r} -> {after!r})"
                page.locator('[data-page="tasks"]').click()
                assert page.locator("#page-tasks").is_visible(), "Tasks navigation did not show its panel"
                print("PASS supplier interactions — theme toggle and Tasks navigation")
                passed += 1
            except Exception as exc:
                failures.append(f"supplier interactions: {exc}")
                print(f"FAIL supplier interactions: {exc}")

            # Responsive sanity: ensure core pages do not produce major horizontal overflow.
            mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
            for route in ("/frontend-v3.html", "/supplier-dashboard.html", "/marketplace.html"):
                try:
                    mobile.goto(BASE + route, wait_until="domcontentloaded", timeout=20000)
                    mobile.wait_for_timeout(250)
                    sizes = mobile.evaluate(
                        "() => ({viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth})"
                    )
                    assert sizes["page"] <= sizes["viewport"] + 24, f"horizontal overflow: {sizes}"
                    print(f"PASS mobile width {route} — {sizes}")
                    passed += 1
                except Exception as exc:
                    failures.append(f"mobile {route}: {exc}")
                    print(f"FAIL mobile {route}: {exc}")

            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    print(f"\nVTG browser acceptance: {passed} checks passed; {len(failures)} failed.")
    if failures:
        for failure in failures:
            print(" - " + failure)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
