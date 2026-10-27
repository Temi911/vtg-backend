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
import urllib.error
import urllib.request
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

    # Live read-only Railway/API smoke tests. The static local server intentionally
    # cannot serve /api/*, so test those endpoints directly against the configured backend.
    api_base = "https://vtg-backend-production-ab20.up.railway.app"
    health_paths = ("/health", "/health/live", "/health/ready")
    for path in health_paths:
        status = None
        detail = ""
        try:
            request = urllib.request.Request(api_base + path, headers={"Accept": "application/json", "User-Agent": "VTG-QA-smoke/1.0"})
            with urllib.request.urlopen(request, timeout=12) as response:
                status = response.status
                detail = response.read(240).decode("utf-8", errors="replace").replace("\\n", " ")
        except urllib.error.HTTPError as exc:
            status = exc.code
            detail = exc.read(240).decode("utf-8", errors="replace").replace("\\n", " ")
        except Exception as exc:
            detail = str(exc)
        print(f"RAILWAY health {path}: status={status!r}; detail={detail[:240]!r}")
        if status is not None and 200 <= status < 300:
            passed += 1
        else:
            failures.append(f"Railway health {path}: expected HTTP 2xx, got {status!r} ({detail[:160]})")

    for path in ("/api/market/dashboard", "/api/products"):
        status = None
        detail = ""
        try:
            request = urllib.request.Request(api_base + path, headers={"Accept": "application/json", "User-Agent": "VTG-QA-smoke/1.0"})
            with urllib.request.urlopen(request, timeout=12) as response:
                status = response.status
                detail = response.read(240).decode("utf-8", errors="replace").replace("\\n", " ")
        except urllib.error.HTTPError as exc:
            status = exc.code
            detail = exc.read(240).decode("utf-8", errors="replace").replace("\\n", " ")
        except Exception as exc:
            detail = str(exc)
        print(f"RAILWAY API {path}: status={status!r}; detail={detail[:240]!r}")
        # 401/403 confirms the route is reachable but protected. A 404 indicates a
        # missing route; 5xx or connection errors indicate a service/proxy problem.
        if status is not None and (200 <= status < 300 or status in (401, 403)):
            passed += 1
        else:
            failures.append(f"Railway API {path}: expected 2xx or auth-gated 401/403, got {status!r} ({detail[:160]})")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            desktop = browser.new_context(viewport={"width": 1365, "height": 900})
            page = desktop.new_page()
            page_errors: list[str] = []
            bad_local_assets: list[str] = []
            bad_local_responses: list[str] = []
            external_network_diagnostics: list[str] = []
            page.on("pageerror", lambda error: page_errors.append(f"{error} | {error.stack}"))
            page.on(
                "requestfailed",
                lambda request: bad_local_assets.append(request.url)
                if request.url.startswith(BASE + "/") and "/api/" not in request.url
                else external_network_diagnostics.append("request failed: " + request.url),
            )
            page.on(
                "response",
                lambda response: bad_local_responses.append(f"{response.status} {response.url}")
                if response.status >= 400 and response.url.startswith(BASE + "/") and "/api/" not in response.url
                else external_network_diagnostics.append(f"HTTP {response.status} {response.url}")
                if response.status >= 400
                else None,
            )

            for route in ROUTES:
                page_errors.clear()
                bad_local_assets.clear()
                bad_local_responses.clear()
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
                    assert not bad_local_responses, "local HTTP error response(s): " + " | ".join(bad_local_responses[:3])
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

            # Trade Atlas: exercise its real reset control and record whether the globe renderer/fallback exists.
            try:
                page.goto(BASE + "/trade-atlas.html", wait_until="domcontentloaded", timeout=20000)
                reset_globe = page.locator("#resetGlobe")
                assert reset_globe.count() == 1, "Trade Atlas reset-globe control is missing"
                reset_globe.click(timeout=3000)
                page.wait_for_timeout(250)
                globe_state = page.evaluate("""() => ({canvas: !!document.querySelector('#globeViz canvas, .globeCanvas canvas'), fallback: !!document.querySelector('.globeFallback'), map: !!document.querySelector('#locationMap .leaflet-container'), resetVisible: !!document.querySelector('#resetGlobe') && getComputedStyle(document.querySelector('#resetGlobe')).display !== 'none'})""")
                assert globe_state["resetVisible"], "Trade Atlas reset control became unavailable"
                print(f"PASS Trade Atlas interaction — reset control works; renderer state {globe_state}")
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
                buyer.evaluate("""() => { const link = document.querySelector('[data-view="trade-desk"]'); if (!link) throw new Error('Trade Desk navigation link missing'); link.click(); }""")
                buyer.wait_for_selector("#page-trade-desk.active", state="visible", timeout=10000)
                buyer.wait_for_selector("#sharedBuyerForm", state="visible", timeout=10000)
                buyer.locator('#sharedBuyerForm input[name="product"]').fill("QA-only sample bolts")
                buyer.locator('#sharedBuyerForm input[name="quantity"]').fill("12")
                buyer.locator('#sharedBuyerForm button[type="submit"]').click(timeout=3000)
                buyer.wait_for_timeout(250)
                assert "QA-only sample bolts" in buyer.locator("#sharedBuyerRows").inner_text(), "submitted request was not shown in the buyer trade desk"
                buyer.reload(wait_until="domcontentloaded", timeout=20000)
                buyer.wait_for_timeout(250)
                buyer.evaluate("""() => { const link = document.querySelector('[data-view="trade-desk"]'); if (!link) throw new Error('Trade Desk navigation link missing after reload'); link.click(); }""")
                buyer.wait_for_selector("#page-trade-desk.active", state="visible", timeout=5000)
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

            # Bank theme control: inspect visibility and verify a real user click changes theme.
            try:
                bank_theme_page = browser.new_context(viewport={"width": 1365, "height": 900}).new_page()
                bank_theme_page.goto(BASE + "/bank-trade-os.html?preview=1", wait_until="domcontentloaded", timeout=20000)
                bank_theme_page.wait_for_timeout(500)
                theme_button = bank_theme_page.locator("#vf-theme-toggle")
                diagnostic = theme_button.evaluate("""el => { const a=[]; for(let n=el;n&&a.length<6;n=n.parentElement){const s=getComputedStyle(n),r=n.getBoundingClientRect();a.push({tag:n.tagName,id:n.id,cls:String(n.className||'').slice(0,80),display:s.display,visibility:s.visibility,opacity:s.opacity,rect:{x:r.x,y:r.y,width:r.width,height:r.height}})} return a }""")
                print("Bank theme visibility diagnostic:", diagnostic)
                assert theme_button.is_visible(), f"bank theme toggle is hidden: {diagnostic}"
                before_theme = bank_theme_page.locator("html").get_attribute("data-theme")
                theme_button.click(timeout=3000)
                after_theme = bank_theme_page.locator("html").get_attribute("data-theme")
                assert before_theme != after_theme, f"bank theme toggle did not change theme: {before_theme!r} -> {after_theme!r}"
                print("PASS bank preview theme toggle")
                passed += 1
                bank_theme_page.context.close()
            except Exception as exc:
                failures.append(f"bank theme toggle: {exc}")
                print(f"FAIL bank theme toggle: {exc}")

            # Bank case workflow: create synthetic browser-local data, reload, and verify persistence.
            try:
                bank_case_page = browser.new_context(viewport={"width": 1365, "height": 900}).new_page()
                bank_errors: list[str] = []
                bank_case_page.on("pageerror", lambda error: bank_errors.append(str(error)))
                bank_case_page.goto(BASE + "/bank-trade-os.html?preview=1", wait_until="domcontentloaded", timeout=20000)
                bank_case_page.wait_for_selector("#caseForm", state="attached", timeout=10000)
                bank_case_page.locator('[data-action="new-case"]').first.click(timeout=3000)
                bank_case_page.locator("#caseForm").wait_for(state="visible", timeout=5000)
                bank_case_page.locator("#fref").fill("QA-LOCAL-TEST-2026")
                bank_case_page.locator("#famount").fill("123")
                bank_case_page.locator("#fgoods").fill("Synthetic QA sample only; no real transaction")
                bank_case_page.locator('#caseForm button[type="submit"]').click(timeout=3000)
                bank_case_page.wait_for_timeout(200)
                assert "QA-LOCAL-TEST-2026" in bank_case_page.locator("#caseRows").inner_text(), "new local case was not listed"
                bank_case_page.reload(wait_until="domcontentloaded", timeout=20000)
                bank_case_page.wait_for_timeout(200)
                bank_case_page.locator('button.navgroup-toggle[data-navgroup="workspace"]').click(timeout=3000)
                bank_case_page.locator('.navbtn[data-view="applications"]').click(timeout=3000)
                assert "QA-LOCAL-TEST-2026" in bank_case_page.locator("#caseRows").inner_text(), "bank local case did not persist after reload"
                assert not bank_errors, "bank preview JavaScript error(s): " + " | ".join(bank_errors[:3])
                print("PASS bank preview workflow — synthetic local case persisted after reload")
                passed += 1
                bank_case_page.context.close()
            except Exception as exc:
                failures.append(f"bank preview save/reload: {exc}")
                print(f"FAIL bank preview save/reload: {exc}")

            # Check primary landing navigation reaches Trade Atlas using the site's own link.
            try:
                page.goto(BASE + "/frontend-v3.html", wait_until="domcontentloaded", timeout=20000)
                atlas_links = page.locator('a[href="/trade-atlas.html"]')
                assert atlas_links.count() > 0, "landing page has no Trade Atlas link"
                atlas_links.first.click(timeout=3000)
                page.wait_for_url("**/trade-atlas.html", timeout=5000)
                assert "Trade Atlas" in page.title(), f"unexpected navigation destination: {page.url}"
                print("PASS landing navigation — Trade Atlas link opens the Atlas page")
                passed += 1
            except Exception as exc:
                failures.append(f"landing navigation: {exc}")
                print(f"FAIL landing navigation: {exc}")

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

    print("External network diagnostics (review each; third-party failures may be transient):", external_network_diagnostics[:30])
    print(f"\nVTG browser acceptance: {passed} checks passed; {len(failures)} failed.")
    if failures:
        for failure in failures:
            print(" - " + failure)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
