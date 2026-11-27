"""Verify the fixes made from the Ahmed Badry review.

Run from the project root (the server must already be running):

    python scripts/verify_fixes.py

Or let the bundled helper start/stop `npm run dev` for you:

    python <skill>/scripts/with_server.py --server "npm run dev" --port 3000 -- \
        python scripts/verify_fixes.py

Set BASE_URL if the app runs on another port.
"""

import os
import sys

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000")
results = []


def record(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}{(' — ' + detail) if detail else ''}")


def check_no_horizontal_scroll(page, path, width):
    page.set_viewport_size({"width": width, "height": 800})
    response = page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
    record(f"HTTP 200 {path} @ {width}px", bool(response and response.status == 200),
           f"status={response.status if response else 'none'}")
    metrics = page.evaluate(
        """() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            bodyWidth: document.body.scrollWidth,
        })"""
    )
    ok = metrics["scrollWidth"] <= metrics["innerWidth"] and metrics["bodyWidth"] <= metrics["innerWidth"]
    record(f"no horizontal scroll {path} @ {width}px", ok, str(metrics))

    # Scope to <header>: the homepage also has two visible CTAs with the same
    # name in the hero/demo sections — those are meant to stay visible.
    cta = page.locator("header").get_by_role("link", name="Build My Financial Twin")
    hidden = cta.count() == 0 or not cta.first.is_visible()
    record(f"header CTA hidden {path} @ {width}px", hidden, f"header matches={cta.count()}")


def check_404(page, path):
    response = page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
    status = response.status if response else 0
    body = page.locator("body").inner_text()
    # src/app/(app)/loading.tsx makes Next.js flush a 200 shell before notFound()
    # resolves, so the HTTP status stays 200 while the not-found UI renders.
    found = "part of the model" in body
    record(f"not-found UI for {path}", found,
           f"status={status} (streamed via loading.tsx), not-found copy={'yes' if found else 'no'}")


def check_headers(page):
    response = page.goto(BASE_URL, wait_until="domcontentloaded")
    headers = response.headers if response else {}
    expected = {
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "strict-origin-when-cross-origin",
        "permissions-policy": None,
    }
    for key, value in expected.items():
        actual = headers.get(key)
        ok = actual is not None and (value is None or value.lower() in actual.lower())
        record(f"header {key}", ok, f"got={actual}")


def check_amount_cap(page):
    page.set_viewport_size({"width": 1280, "height": 900})
    page.goto(f"{BASE_URL}/transactions", wait_until="networkidle")
    page.get_by_role("button", name="Add transaction").first.click()
    number = page.locator('input[type="number"]').first
    number.wait_for(state="visible")
    max_attr = number.get_attribute("max")
    record("MoneyInput max attribute", bool(max_attr), f"max={max_attr}")

    number.fill("99999999999")
    page.get_by_placeholder("Groceries, salary, rent…").fill("Verification transaction")
    page.get_by_role("button", name="Add transaction").last.click()
    page.wait_for_timeout(500)
    body = page.locator("body").inner_text()
    capped = "Amount must be at most" in body
    record("huge amount rejected", capped, "error shown" if capped else "no cap error")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        check_headers(page)
        for width in (360, 390):
            for path in ("/", "/faq", "/security"):
                check_no_horizontal_scroll(page, path, width)
        for path in ("/reports/nope", "/goals/xyz", "/accounts/bad"):
            check_404(page, path)
        try:
            check_amount_cap(page)
        except Exception as exc:  # noqa: BLE001 - report, do not abort other checks
            record("amount cap check", False, f"selector issue: {exc}")

        record("no uncaught page errors", not errors, "; ".join(errors[:3]))
        browser.close()

    failed = [name for name, ok, _ in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    if failed:
        print("Failed: " + ", ".join(failed))
        sys.exit(1)


if __name__ == "__main__":
    main()
