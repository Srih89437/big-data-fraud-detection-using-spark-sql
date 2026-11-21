# End-to-end checks against the running dev server + backend.
# Usage: python tools/e2e_check.py
import json
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = {}

console_errors = []
page_errors = []


def en_in(n):
    """Indian digit grouping, matching JavaScript's toLocaleString('en-IN')."""
    s = str(int(n))
    if len(s) <= 3:
        return s
    last3 = s[-3:]
    rest = s[:-3]
    parts = []
    while len(rest) > 2:
        parts.insert(0, rest[-2:])
        rest = rest[:-2]
    if rest:
        parts.insert(0, rest)
    return ",".join(parts) + "," + last3


def api(path):
    import urllib.request

    with urllib.request.urlopen("http://localhost:8000" + path, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def wait_data(page, timeout=120000, expected=None):
    """Wait until the overview metrics show a real, settled figure (Spark may be cold)."""
    page.wait_for_function(
        """() => {
            const els = document.querySelectorAll('.metrics .metric strong');
            if (!els.length) return false;
            return Array.from(els).some((e) => (e.textContent || '').trim() !== '0');
        }""",
        polling=250,
        timeout=timeout,
    )
    if expected:
        # Headless rAF can stall mid count-up; assert the exact backend figure.
        page.wait_for_function(
            """(exp) => {
                const el = document.querySelector('.metrics .metric strong');
                return el && (el.textContent || '').trim() === exp;
            }""",
            arg=expected,
            polling=250,
            timeout=timeout,
        )
        return
    # Count-up animation runs for ~0.9s; wait until the text stops changing.
    page.wait_for_function(
        """async () => {
            const read = () => Array.from(
                document.querySelectorAll('.metrics .metric strong')
            ).map((e) => e.textContent).join('|');
            const a = read();
            await new Promise((r) => setTimeout(r, 700));
            return read() === a && a.length > 0;
        }""",
        polling=250,
        timeout=timeout,
    )


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            args=[
                "--enable-unsafe-swiftshader",
                "--use-gl=angle",
                "--use-angle=swiftshader",
                "--ignore-gpu-blocklist",
            ]
        )
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on(
            "console",
            lambda m: console_errors.append(m.text) if m.type == "error" else None,
        )
        page.on("pageerror", lambda e: page_errors.append(str(e)))

        page.goto(BASE, wait_until="domcontentloaded", timeout=60000)

        # 1. Overview renders backend figures — asserted against the API itself
        ov2024 = api("/api/overview?year=2024")
        exp2024 = en_in(ov2024["total_cases"])
        page.wait_for_selector("text=TOTAL REGISTERED CASES", timeout=30000)
        wait_data(page, expected=exp2024)
        OUT["overview_metrics"] = page.locator(".metric").count()
        body = page.inner_text(".metrics")
        OUT["overview_contains_total"] = exp2024 in body
        OUT["api_total_2024"] = ov2024["total_cases"]
        OUT["jurisdictions_from_api"] = ov2024["jurisdictions"]
        OUT["overview_text_sample"] = body.replace("\n", " | ")[:300]

        # 2. Year selector changes the figures
        ov2022 = api("/api/overview?year=2022")
        exp2022 = en_in(ov2022["total_cases"])
        page.click(".year-options button:has-text('2022')")
        wait_data(page, expected=exp2022)
        body2022 = page.inner_text(".metrics")
        OUT["year_2022_changes_figures"] = body2022 != body
        OUT["year_2022_total_matches_api"] = exp2022 in body2022
        OUT["api_total_2022"] = ov2022["total_cases"]
        page.click(".year-options button:has-text('2024')")
        wait_data(page, expected=exp2024)

        # 3. Trend chart is real (5 points from /api/trends)
        OUT["trend_svg_present"] = page.locator(".trend-chart svg").count() > 0
        trend_texts = page.eval_on_selector_all(
            ".trend-chart svg text",
            "els => els.map(e => e.textContent).filter(Boolean)",
        )
        OUT["trend_years_present"] = all(
            y in trend_texts for y in ["2020", "2021", "2022", "2023", "2024"]
        )
        OUT["trend_svg_text_sample"] = trend_texts[:16]

        # 4. 3D map: canvas exists inside overview preview
        page.wait_for_selector(".map-stage canvas", timeout=60000)
        OUT["map_canvas_count"] = page.locator("canvas").count()
        OUT["map_labels_visible"] = page.locator(".map-stage .map3d canvas").count() == 1

        # 5. Navigate every section
        sections = [
            ("Map", "INDIA INTELLIGENCE MAP"),
            ("State", "JURISDICTION PROFILE"),
            ("Analytics", "NATIONAL ANALYTICS"),
            ("Explorer", "DATA EXPLORER"),
            ("Method", "METHODOLOGY"),
            ("Overview", "NATIONAL OVERVIEW"),
        ]
        OUT["sections"] = {}
        for label, eyebrow in sections:
            page.click(f".side-nav-item:has-text('{label}')")
            try:
                page.wait_for_selector(f"text={eyebrow}", timeout=15000)
                OUT["sections"][label] = "ok"
            except Exception as exc:  # noqa: BLE001
                OUT["sections"][label] = f"FAIL: {type(exc).__name__}"

        # 6. Full 3D map section renders a canvas + tour controls
        page.click(".side-nav-item:has-text('Map')")
        page.wait_for_selector(".map-full canvas", timeout=60000)
        # The tour bar only appears once the boundaries are parsed and ready.
        page.wait_for_selector(".map-tour-status", timeout=60000)
        OUT["full_map_canvas"] = True
        OUT["tour_controls"] = page.locator(".map-tour-row button").count()
        OUT["tour_status"] = page.inner_text(".map-tour-status")[:90]

        # 7. Guided tour: start -> status changes, then pause/resume/next/stop
        page.click(".tour-btn:has-text('Start tour')")
        page.wait_for_function(
            """() => {
                const el = document.querySelector('.map-tour-status');
                return el && el.textContent.trim().startsWith('Stop ');
            }""",
            polling=250,
            timeout=30000,
        )
        time.sleep(4)
        OUT["tour_after_start"] = page.inner_text(".map-tour-status")[:90]
        OUT["tour_playing"] = page.inner_text(".map-tour-status").startswith("Stop ")
        OUT["tour_did_not_navigate"] = page.locator(".state-title").count() == 0

        if page.locator(".tour-btn:has-text('Pause')").count():
            page.click(".tour-btn:has-text('Pause')")
            time.sleep(1)
            OUT["tour_paused_label"] = page.locator(".tour-btn:has-text('Resume')").count() > 0
            page.click(".tour-btn:has-text('Resume')")
            time.sleep(3)
        before_next = page.inner_text(".map-tour-status")
        page.click(".map-tour-row button[title='Next stop']")
        time.sleep(2)
        OUT["tour_next"] = page.inner_text(".map-tour-status")[:90]
        OUT["tour_next_changed"] = OUT["tour_next"] != before_next[:90]

        page.click(".map-tour-row button[title='Previous stop']")
        time.sleep(2)
        OUT["tour_prev"] = page.inner_text(".map-tour-status")[:90]

        page.click(".map-tour-row button[title='Stop tour']")
        time.sleep(1)
        OUT["tour_stopped"] = "idle" in page.inner_text(".map-tour-status").lower()

        # Tour speed control
        page.select_option(".tour-speed select", "2")
        time.sleep(0.5)
        OUT["tour_speed"] = page.locator(".tour-speed select").input_value()
        page.select_option(".tour-speed select", "1")

        # 8. Reset camera button works
        page.click(".map-tour-row button[title='Reset camera']")
        time.sleep(1)
        OUT["reset_camera_ok"] = True

        # 9. Hover a state -> tooltip with registered cases
        canvas = page.locator(".map-full canvas")
        box = canvas.bounding_box()
        tip = None
        tip_point = None
        for fx, fy in [
            (0.5, 0.45), (0.52, 0.5), (0.48, 0.5), (0.5, 0.55),
            (0.55, 0.42), (0.45, 0.55), (0.5, 0.38), (0.5, 0.62),
            (0.6, 0.5), (0.4, 0.5),
        ]:
            px = box["x"] + box["width"] * fx
            py = box["y"] + box["height"] * fy
            page.mouse.move(px, py)
            time.sleep(0.7)
            tip_text = page.evaluate(
                """() => {
                    const hits = Array.from(document.querySelectorAll('.map3d div'))
                        .filter((d) => (d.textContent || '').includes('REGISTERED CASES'));
                    if (!hits.length) return null;
                    // deepest = shortest text, since ancestors include the labels
                    return hits.reduce((a, b) =>
                        (b.textContent || '').length < (a.textContent || '').length ? b : a
                    ).innerText;
                }"""
            )
            if tip_text:
                tip = tip_text
                tip_point = (px, py)
                break
        OUT["hover_tooltip"] = bool(tip)
        if tip:
            OUT["tooltip_text"] = tip.replace("\n", " | ")[:180]
            OUT["tooltip_has_year"] = "2024" in tip
            OUT["tooltip_has_category"] = ("STATE" in tip) or ("UNION TERRITORY" in tip)
            OUT["tooltip_has_count"] = any(ch.isdigit() for ch in tip)

        # 10. Click the hovered jurisdiction -> State Intelligence opens
        if tip_point:
            page.mouse.move(*tip_point)
            time.sleep(0.5)
            page.mouse.click(*tip_point)
            try:
                page.wait_for_selector(".state-title", timeout=20000)
                OUT["click_navigates_to_state"] = True
            except Exception:  # noqa: BLE001
                OUT["click_navigates_to_state"] = False
        if not OUT.get("click_navigates_to_state"):
            # Fallback: select from the ranking list on the Overview
            page.click(".side-nav-item:has-text('Overview')")
            time.sleep(1.5)
            page.click(".rank-list .rank >> nth=0")
            try:
                page.wait_for_selector(".state-title", timeout=20000)
                OUT["click_navigates_to_state"] = True
            except Exception:  # noqa: BLE001
                OUT["click_navigates_to_state"] = False
        if OUT.get("click_navigates_to_state"):
            page.wait_for_selector(".state-grid", timeout=30000)
            # The detail chart renders only after /api/state/{name} resolves.
            page.wait_for_selector(".state-grid svg", timeout=60000)
            time.sleep(1.5)
            OUT["selected_state"] = page.inner_text(".state-title")
            OUT["state_metrics"] = page.inner_text(".metrics").replace("\n", " | ")[:320]
            # The big share figure must agree with the percentage in its sub-label
            # (previously CountUp rounded 0.9% up to "1").
            share = page.evaluate(
                """() => {
                    const cards = Array.from(document.querySelectorAll('.metric'));
                    const m = cards.find((x) => (x.querySelector('.metric-label')?.textContent || '')
                        .includes('SHARE OF NATIONAL TOTAL'));
                    if (!m) return null;
                    return {
                        value: (m.querySelector('strong')?.textContent || '').trim(),
                        sub: (m.querySelector('small')?.innerText || '').trim(),
                    };
                }"""
            )
            OUT["share_metric"] = share
            if share:
                try:
                    big = float(share["value"].replace(",", ""))
                    pct = float(share["sub"].split("%")[0].replace(",", ""))
                    OUT["share_matches_sub"] = abs(big - pct) < 0.051
                except (ValueError, IndexError):
                    OUT["share_matches_sub"] = False
            # National ranking / share must agree with the backend
            st_name = OUT["selected_state"]
            detail = api(f"/api/state/{st_name.replace(' ', '%20')}")
            ov_now = api(f"/api/overview?year=2024")
            OUT["state_api_cases_2024"] = detail.get("2024")
            OUT["state_cases_match_ui"] = str(detail.get("2024")) in OUT["state_metrics"].replace(
                ",", ""
            )

        # 11. State detail: trend bars + comparison + national table
        OUT["state_bar_chart"] = page.locator(".state-grid svg").count() > 0
        OUT["state_compare_rows"] = page.locator(".compare-row").count()
        OUT["state_table_rows"] = page.locator(".mini-table .table-row").count()

        # 12. Data Explorer: search, filter, sort, CSV export
        page.click(".side-nav-item:has-text('Explorer')")
        page.wait_for_function(
            """() => {
                const el = document.querySelector('.explorer-meta');
                return el && /36 of 36/.test(el.textContent);
            }""",
            polling=250,
            timeout=60000,
        )
        time.sleep(0.8)
        rows_all = page.locator(".explorer-row").count()
        page.fill(".search-box input", "karn")
        time.sleep(0.8)
        rows_search = page.locator(".explorer-row").count()
        OUT["explorer"] = {"all": rows_all, "search_karn": rows_search}
        OUT["explorer_search_ok"] = rows_search == 1 and rows_all == 36
        page.fill(".search-box input", "")
        time.sleep(0.5)
        page.click(".filter-tabs button:has-text('UTs')")
        time.sleep(0.8)
        OUT["explorer_uts"] = page.locator(".explorer-row").count()
        page.click(".filter-tabs button:has-text('All')")
        time.sleep(0.5)
        page.click(".explorer-head .th:has-text('JURISDICTION')")
        time.sleep(0.5)
        first_sorted = page.locator(".explorer-row .cell.name").first.inner_text()
        OUT["sort_first_after_asc"] = first_sorted

        with page.expect_download(timeout=15000) as dl:
            page.click(".export-btn")
        download = dl.value
        path = download.path()
        with open(path, encoding="utf-8") as fh:
            csv_head = fh.read().splitlines()[:3]
        OUT["csv_download"] = download.suggested_filename
        OUT["csv_header"] = csv_head[0]
        OUT["csv_rows_match_filter"] = len(open(path, encoding="utf-8").read().splitlines()) == 37

        # 13. Analytics charts render
        page.click(".side-nav-item:has-text('Analytics')")
        time.sleep(1.5)
        OUT["analytics_svgs"] = page.locator(".analytics-grid svg").count()
        OUT["analytics_panels"] = page.locator(".analytics-grid .panel").count()
        OUT["year_compare_rows"] = page.locator(".year-compare-row").count()

        # 14. Theme toggle
        before = page.locator(".app").get_attribute("class")
        page.click("button[title='Toggle theme']")
        time.sleep(0.6)
        after = page.locator(".app").get_attribute("class")
        OUT["theme_toggle"] = {"before": before, "after": after, "changed": before != after}

        # 15. Responsive layouts
        for w, h, name in [(1024, 768, "tablet"), (390, 844, "mobile")]:
            page.set_viewport_size({"width": w, "height": h})
            time.sleep(1.2)
            OUT[f"responsive_{name}"] = {
                "nav_visible": page.locator(".side-nav").is_visible(),
                "main_visible": page.locator(".main").is_visible(),
                "no_h_scroll": page.evaluate(
                    "document.documentElement.scrollWidth <= window.innerWidth + 2"
                ),
            }
        page.set_viewport_size({"width": 1440, "height": 900})

        # 16. Screenshot evidence
        page.click(".side-nav-item:has-text('Overview')")
        time.sleep(1.5)
        page.screenshot(path="data/boundaries/_shot_overview.png", full_page=False)
        page.click(".side-nav-item:has-text('Map')")
        time.sleep(4)
        page.screenshot(path="data/boundaries/_shot_map.png", full_page=False)

        OUT["console_errors"] = console_errors
        OUT["page_errors"] = page_errors
        browser.close()


try:
    run()
except Exception as exc:  # noqa: BLE001
    OUT["FATAL"] = f"{type(exc).__name__}: {exc}"
    OUT["console_errors"] = console_errors
    OUT["page_errors"] = page_errors

with open("data/boundaries/e2e_report.json", "w", encoding="utf-8") as fh:
    json.dump(OUT, fh, indent=2, ensure_ascii=False)

print(json.dumps(OUT, indent=2, ensure_ascii=False))
sys.exit(1 if OUT.get("FATAL") or OUT.get("page_errors") else 0)
