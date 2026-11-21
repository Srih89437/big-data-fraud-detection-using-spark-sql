"""
Capture baseline screenshots of every section at 1440x900 and 390x844.
Saves outputs to qa/baseline/
"""
import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.abspath("qa/baseline")
os.makedirs(OUTPUT_DIR, exist_ok=True)

VIEWPORTS = [
    {"name": "desktop", "width": 1440, "height": 900},
    {"name": "mobile", "width": 390, "height": 844},
]

SECTIONS = [
    {"id": "overview", "shortcut": "1"},
    {"id": "map", "shortcut": "2"},
    {"id": "state", "shortcut": "3"},
    {"id": "analytics", "shortcut": "4"},
    {"id": "explorer", "shortcut": "5"},
    {"id": "studio", "shortcut": "6"},
    {"id": "methodology", "shortcut": "7"},
]

def capture():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for vp in VIEWPORTS:
            context = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                device_scale_factor=1,
            )
            page = context.new_page()
            print(f"Navigating to http://localhost:5173/ for {vp['name']}...")
            page.goto("http://localhost:5173/", wait_until="networkidle", timeout=30000)
            time.sleep(2)  # Allow WebGL / Three.js canvas to initialize

            for s in SECTIONS:
                # Switch section via keyboard shortcut
                page.keyboard.press(s["shortcut"])
                time.sleep(1.5)  # Allow animations / 3D frames to settle
                out_path = os.path.join(OUTPUT_DIR, f"{vp['name']}_{s['id']}.png")
                page.screenshot(path=out_path, full_page=False)
                print(f"  Captured {vp['name']} {s['id']} -> {out_path}")

            context.close()
        browser.close()
    print("Baseline capture complete!")

if __name__ == "__main__":
    capture()
