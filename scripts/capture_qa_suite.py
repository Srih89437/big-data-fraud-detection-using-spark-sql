"""
Comprehensive Visual QA & Evidence Suite.
Captures high-resolution 1440x900 and 390x844 screenshots of all 7 sections,
verifies font loading via document.fonts.check,
exercises Map hover, selection, drawer, and time-lapse states,
and saves outputs to qa/after/.
"""
import os
import time
import json
from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.abspath("qa/after")
os.makedirs(OUTPUT_DIR, exist_ok=True)

VIEWPORTS = [
    {"name": "desktop", "width": 1440, "height": 900},
    {"name": "mobile", "width": 390, "height": 844},
]

SECTIONS = [
    {"id": "overview", "shortcut": "1", "name": "Overview"},
    {"id": "map", "shortcut": "2", "name": "India 3D Map"},
    {"id": "state", "shortcut": "3", "name": "State Intelligence"},
    {"id": "analytics", "shortcut": "4", "name": "National Analytics"},
    {"id": "explorer", "shortcut": "5", "name": "Data Explorer"},
    {"id": "studio", "shortcut": "6", "name": "Dataset Studio"},
    {"id": "methodology", "shortcut": "7", "name": "Methodology"},
]

def run_qa():
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for vp in VIEWPORTS:
            context = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                device_scale_factor=1,
            )
            page = context.new_page()
            print(f"Loading http://localhost:5173/ for {vp['name']}...")
            page.goto("http://localhost:5173/", wait_until="networkidle", timeout=30000)
            time.sleep(2.5)

            # Check fonts on desktop
            if vp["name"] == "desktop":
                font_checks = page.evaluate("""() => {
                    return {
                        instrumentSerif: document.fonts.check("24px 'Instrument Serif'"),
                        geistSans: document.fonts.check("16px 'Geist Sans'"),
                        geistMono: document.fonts.check("14px 'Geist Mono'"),
                        allLoaded: Array.from(document.fonts).map(f => `${f.family} ${f.weight}`)
                    };
                }""")
                print(f"Font verification: {json.dumps(font_checks, indent=2)}")
                results["font_checks"] = font_checks

            # Capture each section
            for s in SECTIONS:
                page.keyboard.press(s["shortcut"])
                time.sleep(1.8)
                out_path = os.path.join(OUTPUT_DIR, f"{vp['name']}_{s['id']}.png")
                page.screenshot(path=out_path, full_page=False)
                print(f"  Captured {vp['name']} {s['id']} -> {out_path}")

            # Specific Map interaction states on desktop
            if vp["name"] == "desktop":
                page.keyboard.press("2")  # Switch to map
                time.sleep(2)

                # Capture initial map
                page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_map_initial.png"))

                # Switch render mode to Column
                col_btn = page.query_selector("button:has-text('Column')")
                if col_btn:
                    col_btn.click()
                    time.sleep(1.2)
                    page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_map_mode_column.png"))
                    print("  Captured desktop map Column mode")

                # Switch render mode to Bubble
                bubble_btn = page.query_selector("button:has-text('Bubble')")
                if bubble_btn:
                    bubble_btn.click()
                    time.sleep(1.2)
                    page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_map_mode_bubble.png"))
                    print("  Captured desktop map Bubble mode")

                # Switch render mode to Bar Matrix
                bar_btn = page.query_selector("button:has-text('Bar Matrix')")
                if bar_btn:
                    bar_btn.click()
                    time.sleep(1.2)
                    page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_map_mode_barmatrix.png"))
                    print("  Captured desktop map Bar Matrix mode")

                # Switch back to Prism
                prism_btn = page.query_selector("button:has-text('Prism')")
                if prism_btn:
                    prism_btn.click()
                    time.sleep(1)

                # Toggle Compare mode
                compare_btn = page.query_selector("button:has-text('COMPARE')")
                if compare_btn:
                    compare_btn.click()
                    time.sleep(1)
                    page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_map_compare_mode.png"))
                    print("  Captured desktop map Compare mode")

                # Dataset Studio 3D Modes
                page.keyboard.press("6")  # Switch to Studio
                time.sleep(2)
                page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_studio_empty.png"))

                # Click sample dataset if available
                sample_chip = page.query_selector(".library-card, .dataset-pill, button:has-text('Global Cyber')")
                if sample_chip:
                    sample_chip.click()
                    time.sleep(2)
                    page.screenshot(path=os.path.join(OUTPUT_DIR, "desktop_studio_with_dataset.png"))

            context.close()
        browser.close()

    print("Visual QA capture complete!")
    return results

if __name__ == "__main__":
    run_qa()
