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
            page.on("pageerror", lambda error: page_errors.append(f"{error} | {error.stack}"))
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
                theme = page.locator("#vf-theme-toggle")
                assert theme.count() == 1, "shared dashboard theme toggle is missing"
                visibility = theme.evaluate("""el => {
                  const chain = [];
                  for (let n = el; n && chain.length < 6; n = n.parentElement) {
                    const s = getComputedStyle(n), r = n.getBoundingClientRect();
                    chain.push({tag:n.tagName,id:n.id,cls:String(n.className||'').slice(0,100),
                      display:s.display,visibility:s.visibility,opacity:s.opacity,
                      rect:{x:r.x,y:r.y,width:r.width,height:r.height}});
                  }
                  return chain;
                }""")
                print("Shared dashboard theme control diagnostic:", visibility)
                assert theme.is_visible(), f"shared dashboard theme toggle is not visible: {visibility}"
                before = page.locator("html").get_attribute("data-theme")
                theme.click(timeout=3000)
                page.wait_for_timeout(150)
                after = page.locator("html").get_attribute("data-theme")
                assert before != after, f"theme toggle did not change theme ({before!r} -> {after!r})"
                page.locator('button.groupBtn[data-group="workspace"]').click(timeout=3000)
                page.locator('[data-page="tasks"]').click(timeout=3000)
                assert page.locator("#page-tasks").is_visible(), "Tasks navigation did not show its panel"
                print("PASS supplier interactions — theme toggle and Tasks navigation")
                passed += 1
            except Exception as exc:
                failures.append(f"supplier interactions: {exc}")
                print(f"FAIL supplier interactions: {exc}")

            # Exercise landing-page category carousel and verify the selected category changes.
            try:
                page.goto(BASE + "/frontend-v3.html", wait_until="domcontentloaded", timeout=20000)
                page.wait_for_selector("#vtgProductCarousel .vtgNext", timeout=10000)
                category_title = page.locator("#vtgProductCarousel .vtgInfo strong")
                before_category = category_title.inner_text().strip()
                page.locator("#vtgProductCarousel .vtgNext").click(timeout=3000)
                page.wait_for_timeout(100)
                after_category = category_title.inner_text().strip()
                assert before_category and after_category and before_category != after_category, f"carousel category did not advance: {before_category!r} -> {after_category!r}"
                print(f"PASS marketplace category carousel — {before_category!r} -> {after_category!r}")
                passed += 1
            except Exception as exc:
                failures.append(f"marketplace carousel: {exc}")
                print(f"FAIL marketplace carousel: {exc}")

            # Trade Atlas: theme selector should switch the document theme; report globe fallback state.
            try:
                page.goto(BASE + "/trade-atlas.html", wait_until="domcontentloaded", timeout=20000)
                selector = page.locator("#atlasThemePreference")
                assert selector.count() == 1, "Trade Atlas theme preference selector is missing"
                initial_theme = page.locator("html").get_attribute("data-theme")
                target_theme = "light" if initial_theme != "light" else "dark"
                selector.select_option(target_theme, timeout=3000)
                page.wait_for_timeout(150)
                actual_theme = page.locator("html").get_attribute("data-theme")
                assert actual_theme == target_theme, f"Atlas theme did not update: expected {target_theme}, got {actual_theme}"
                globe_state = page.evaluate("""() => ({canvas: !!document.querySelector('.globeCanvas canvas'), fallback: getComputedStyle(document.querySelector('.globeFallback') || document.body).display, map: !!document.querySelector('#map, .leaflet-container')})""")
                print(f"PASS Trade Atlas theme toggle — {initial_theme!r} -> {actual_theme!r}; visual state {globe_state}")
                passed += 1
            except Exception as exc:
                failures.append(f"Trade Atlas interaction: {exc}")
                print(f"FAIL Trade Atlas interaction: {exc}")

            # Buyer preview workflow: submit a harmless test request in an isolated browser context,
            # then reload and confirm the browser-local draft persists. No API/real account is used.
            try:
                workflow = browser.new_context(viewport={"width": 1365, "height": 900})
                buyer = workflow.new_page()
                buyer_errors: list[str] = []
                buyer.on("pageerror", lambda error: buyer_errors.append(str(error)))
                buyer.goto(BASE + "/buyer-dashboard.html?preview=1", wait_until="domcontentloaded", timeout=20000)
                buyer.wait_for_selector("#sharedBuyerForm", timeout=10000)
                buyer.locator('#sharedBuyerForm input[name="product"]').fill("QA-only sample bolts")
                buyer.locator('#sharedBuyerForm input[name="quantity"]').fill("12")
                buyer.locator('#sharedBuyerForm button[type="submit"]').click(timeout=3000)
                buyer.wait_for_timeout(250)
                assert "QA-only sample bolts" in buyer.locator("#sharedBuyerRows").inner_text(), "submitted request was not shown in the buyer trade desk"
                buyer.reload(wait_until="domcontentloaded", timeout=20000)
                buyer.wait_for_timeout(250)
                assert "QA-only sample bolts" in buyer.locator("#sharedBuyerRows").inner_text(), "buyer request did not persist after reload"
                assert not buyer_errors, "buyer preview JavaScript error(s): " + " | ".join(buyer_errors[:3])
                print("PASS buyer preview workflow — request saved locally and persisted after reload (isolated test context)")
                passed += 1
                workflow.close()
            except Exception as exc:
                failures.append(f"buyer preview save/reload: {exc}")
                print(f"FAIL buyer preview save/reload: {exc}")

            # Verify expected primary workspace routes load their intended UI or safely redirect to sign-in.
            try:
                for role_route, expected in (("/buyer-dashboard.html", "signin.html"), ("/bank-trade-os.html", "signin.html")):
                    page.goto(BASE + role_route, wait_until="domcontentloaded", timeout=20000)
                    page.wait_for_timeout(200)
                    assert expected in page.url or len(page.locator("body").inner_text().strip()) > 20, f"{role_route} rendered neither its workspace nor sign-in flow"
                print("PASS buyer/bank access gate — workspace route renders or redirects to sign-in without credentials")
                passed += 1
            except Exception as exc:
                failures.append(f"buyer/bank access gate: {exc}")
                print(f"FAIL buyer/bank access gate: {exc}")

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
