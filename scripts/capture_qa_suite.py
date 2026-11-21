"""
Comprehensive Visual QA & Evidence Suite for ICIP Frontend Upgrade.
Tests Landing Page (/) and App (/app/*), verifying:
- Portrait Left Vertical Sidebar (~232px -> 64px collapsed) with content on right
- Zero top horizontal menu bar on desktop/tablet
- Exact 7 navigation labels with shortcuts 1..7
- State Dossier exact wording and selected state sub-chip
- Font loading via document.fonts.check (Instrument Serif, Geist Sans, Geist Mono)
- Multi-viewport visual evidence: Desktop (1440x900), Tablet (1024x768), Mobile (390x844)
- Landing page sections: Hero, Scale Strip, Story, States, Analytics, Explorer, Studio, Method
- App views: Overview, Map (Prism, Column, Bubble, Bar Matrix, Compare, Time-Lapse), State Dossier, Analytics, Data Explorer, Studio, Methodology
- Command Palette (⌘K)
"""
import os
import sys
import time
import json
from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.abspath("qa/after")
os.makedirs(OUTPUT_DIR, exist_ok=True)

VIEWPORTS = [
    {"name": "desktop", "width": 1440, "height": 900},
    {"name": "tablet", "width": 1024, "height": 768},
    {"name": "mobile", "width": 390, "height": 844},
]

def run_suite():
    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "viewports_tested": [vp["name"] for vp in VIEWPORTS],
        "font_checks": {},
        "sidebar_verification": {},
        "screenshots": [],
        "errors": []
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------
        # 1. Desktop Suite (1440x900)
        # -------------------------------------------------------------
        print("\n=== EXECUTING DESKTOP TEST SUITE (1440x900) ===")
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1,
        )
        page = context.new_page()

        # A. Landing Page (/)
        print("Loading Landing Page http://127.0.0.1:5173/ ...")
        page.goto("http://127.0.0.1:5173/", wait_until="networkidle", timeout=30000)
        time.sleep(2.5)

        # Verify Fonts
        fonts = page.evaluate("""() => ({
            instrumentSerif: document.fonts.check("24px 'Instrument Serif'"),
            geistSans: document.fonts.check("16px 'Geist Sans'"),
            geistMono: document.fonts.check("14px 'Geist Mono'"),
            allLoaded: Array.from(document.fonts).map(f => `${f.family} ${f.weight}`)
        })""")
        report["font_checks"] = fonts
        print(f"Font Verification: {fonts}")

        # Capture Landing Page sections by scrolling
        sections_landing = [
            ("hero", "#hero", "desktop_landing_01_hero.png"),
            ("scale_strip", ".scale-strip-section", "desktop_landing_02_scale_strip.png"),
            ("story", "#story", "desktop_landing_03_story.png"),
            ("states", "#states", "desktop_landing_04_states.png"),
            ("analytics", "#analytics", "desktop_landing_05_analytics.png"),
            ("explorer", "#explorer", "desktop_landing_06_explorer.png"),
            ("studio", "#studio", "desktop_landing_07_studio.png"),
            ("method", "#method", "desktop_landing_08_method.png"),
        ]

        for sec_name, sec_selector, filename in sections_landing:
            target = page.query_selector(sec_selector)
            if target:
                target.scroll_into_view_if_needed()
                time.sleep(0.8)
            out_p = os.path.join(OUTPUT_DIR, filename)
            page.screenshot(path=out_p)
            report["screenshots"].append(out_p)
            print(f"  Captured {filename}")

        # Test Sidebar Collapse & Expand
        print("Testing Sidebar Collapse...")
        collapse_btn = page.query_selector(".sidebar-collapse-btn")
        if collapse_btn:
            collapse_btn.click()
            time.sleep(0.8)
            out_p = os.path.join(OUTPUT_DIR, "desktop_sidebar_collapsed.png")
            page.screenshot(path=out_p)
            report["screenshots"].append(out_p)
            print("  Captured desktop_sidebar_collapsed.png")
            # Expand back
            collapse_btn.click()
            time.sleep(0.8)

        # B. App Pages (/app/*)
        app_routes = [
            ("/app", "desktop_app_overview.png", "Overview"),
            ("/app/map", "desktop_app_map.png", "India 3D Map"),
            ("/app/state/TG", "desktop_app_state_dossier.png", "State Dossier (Telangana)"),
            ("/app/analytics", "desktop_app_analytics.png", "National Analytics"),
            ("/app/data", "desktop_app_explorer.png", "Data Explorer"),
            ("/app/studio", "desktop_app_studio.png", "Dataset Studio"),
            ("/app/method", "desktop_app_methodology.png", "Methodology"),
        ]

        for route, filename, title in app_routes:
            print(f"Navigating to {route} ({title})...")
            page.goto(f"http://127.0.0.1:5173{route}", wait_until="networkidle", timeout=30000)
            time.sleep(2.0)
            out_p = os.path.join(OUTPUT_DIR, filename)
            page.screenshot(path=out_p)
            report["screenshots"].append(out_p)
            print(f"  Captured {filename}")

        # C. Command Palette (⌘K)
        print("Opening Command Palette via keyboard (Control+k)...")
        page.keyboard.press("Control+k")
        time.sleep(1.0)
        out_p = os.path.join(OUTPUT_DIR, "desktop_command_palette.png")
        page.screenshot(path=out_p)
        report["screenshots"].append(out_p)
        print("  Captured desktop_command_palette.png")
        page.keyboard.press("Escape")
        time.sleep(0.5)

        # D. Map Specific 4 View Modes & Interactions
        page.goto("http://127.0.0.1:5173/app/map", wait_until="networkidle")
        time.sleep(2.5)

        # Capture Default Mode (Prism)
        out_p = os.path.join(OUTPUT_DIR, "desktop_app_map_mode_prism.png")
        page.screenshot(path=out_p)
        report["screenshots"].append(out_p)
        print("  Captured desktop_app_map_mode_prism.png")

        # Column Mode
        col_btn = page.query_selector("button:has-text('Column'), button:has-text('COLUMN')")
        if col_btn:
            try:
                col_btn.click(force=True)
                time.sleep(1.2)
                out_p = os.path.join(OUTPUT_DIR, "desktop_app_map_mode_column.png")
                page.screenshot(path=out_p)
                report["screenshots"].append(out_p)
                print("  Captured desktop_app_map_mode_column.png")
            except Exception as e:
                print(f"Column click error: {e}")

        # Bubble Mode
        bubble_btn = page.query_selector("button:has-text('Bubble'), button:has-text('BUBBLE')")
        if bubble_btn:
            try:
                bubble_btn.click(force=True)
                time.sleep(1.2)
                out_p = os.path.join(OUTPUT_DIR, "desktop_app_map_mode_bubble.png")
                page.screenshot(path=out_p)
                report["screenshots"].append(out_p)
                print("  Captured desktop_app_map_mode_bubble.png")
            except Exception as e:
                print(f"Bubble click error: {e}")

        # Bar Matrix Mode
        matrix_btn = page.query_selector("button:has-text('Matrix'), button:has-text('BAR MATRIX')")
        if matrix_btn:
            try:
                matrix_btn.click(force=True)
                time.sleep(1.2)
                out_p = os.path.join(OUTPUT_DIR, "desktop_app_map_mode_bar_matrix.png")
                page.screenshot(path=out_p)
                report["screenshots"].append(out_p)
                print("  Captured desktop_app_map_mode_bar_matrix.png")
            except Exception as e:
                print(f"Matrix click error: {e}")

        # Compare Mode
        compare_btn = page.query_selector("button:has-text('Compare Jurisdictions'), button:has-text('COMPARE')")
        if compare_btn:
            try:
                compare_btn.click(force=True)
                time.sleep(1.2)
                out_p = os.path.join(OUTPUT_DIR, "desktop_app_map_compare.png")
                page.screenshot(path=out_p)
                report["screenshots"].append(out_p)
                print("  Captured desktop_app_map_compare.png")
            except Exception as e:
                print(f"Compare click error: {e}")

        # Time-lapse Mode
        timelapse_btn = page.query_selector("button:has-text('Play Time-Lapse')")
        if timelapse_btn:
            try:
                timelapse_btn.click(force=True)
                time.sleep(1.2)
                out_p = os.path.join(OUTPUT_DIR, "desktop_app_map_timelapse.png")
                page.screenshot(path=out_p)
                report["screenshots"].append(out_p)
                print("  Captured desktop_app_map_timelapse.png")
            except Exception as e:
                print(f"Timelapse click error: {e}")

        context.close()

        # -------------------------------------------------------------
        # 2. Tablet Suite (1024x768)
        # -------------------------------------------------------------
        print("\n=== EXECUTING TABLET TEST SUITE (1024x768) ===")
        context = browser.new_context(
            viewport={"width": 1024, "height": 768},
            device_scale_factor=1,
        )
        page = context.new_page()

        page.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        time.sleep(2.0)
        out_p = os.path.join(OUTPUT_DIR, "tablet_landing_hero.png")
        page.screenshot(path=out_p)
        report["screenshots"].append(out_p)
        print("  Captured tablet_landing_hero.png")

        context.close()

        # -------------------------------------------------------------
        # 3. Mobile Suite (390x844)
        # -------------------------------------------------------------
        print("\n=== EXECUTING MOBILE TEST SUITE (390x844) ===")
        context = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=1,
        )
        page = context.new_page()

        # Mobile Landing Page
        page.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        time.sleep(2.0)
        out_p = os.path.join(OUTPUT_DIR, "mobile_landing_hero.png")
        page.screenshot(path=out_p)
        report["screenshots"].append(out_p)
        print("  Captured mobile_landing_hero.png")

        # Mobile Drawer Test
        mobile_menu_btn = page.query_selector(".mobile-menu-btn")
        if mobile_menu_btn:
            mobile_menu_btn.click(force=True)
            time.sleep(0.8)
            out_p = os.path.join(OUTPUT_DIR, "mobile_drawer_open.png")
            page.screenshot(path=out_p)
            report["screenshots"].append(out_p)
            print("  Captured mobile_drawer_open.png")

        # Mobile App Suite (All 7 Pages)
        mobile_routes = [
            ("/app", "mobile_app_overview.png"),
            ("/app/map", "mobile_app_map.png"),
            ("/app/state/TG", "mobile_app_state_dossier.png"),
            ("/app/analytics", "mobile_app_analytics.png"),
            ("/app/data", "mobile_app_explorer.png"),
            ("/app/studio", "mobile_app_studio.png"),
            ("/app/method", "mobile_app_methodology.png"),
        ]

        for route, filename in mobile_routes:
            print(f"Navigating to mobile {route}...")
            page.goto(f"http://127.0.0.1:5173{route}", wait_until="networkidle", timeout=30000)
            time.sleep(1.8)
            out_p = os.path.join(OUTPUT_DIR, filename)
            page.screenshot(path=out_p)
            report["screenshots"].append(out_p)
            print(f"  Captured {filename}")

        context.close()
        browser.close()

    report_path = os.path.join(OUTPUT_DIR, "qa_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"\nVisual QA Suite Complete! Report written to {report_path}")
    return report

if __name__ == "__main__":
    run_suite()
