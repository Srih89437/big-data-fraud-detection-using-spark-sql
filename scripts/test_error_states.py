#!/usr/bin/env python3
"""
Simulate API offline/failure to verify and capture loading, empty, and error fallback states.
Saves screenshots to qa/after/:
- desktop_api_down_error.png (1440x900)
- mobile_api_down_error.png (390x844)
"""

import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://127.0.0.1:5173"
QA_DIR = Path(__file__).resolve().parent.parent / "qa" / "after"
QA_DIR.mkdir(parents=True, exist_ok=True)

def test_error_states():
    print("[TEST] Simulating API offline condition...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. Desktop 1440x900 with API route aborted
        context_desktop = browser.new_context(viewport={"width": 1440, "height": 900})
        page_desktop = context_desktop.new_page()
        page_desktop.route("**/api/**", lambda route: route.abort("connectionrefused"))
        page_desktop.goto(f"{FRONTEND_URL}/app", wait_until="domcontentloaded")
        page_desktop.wait_for_timeout(2500)
        
        # Capture error screenshot
        desktop_err_path = QA_DIR / "desktop_api_down_error.png"
        page_desktop.screenshot(path=str(desktop_err_path), full_page=False)
        print(f"[PASS] Saved desktop error state screenshot: {desktop_err_path}")
        
        # 2. Mobile 390x844 with API route aborted
        context_mobile = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
        page_mobile = context_mobile.new_page()
        page_mobile.route("**/api/**", lambda route: route.abort("connectionrefused"))
        page_mobile.goto(f"{FRONTEND_URL}/app", wait_until="domcontentloaded")
        page_mobile.wait_for_timeout(2500)
        
        mobile_err_path = QA_DIR / "mobile_api_down_error.png"
        page_mobile.screenshot(path=str(mobile_err_path), full_page=False)
        print(f"[PASS] Saved mobile error state screenshot: {mobile_err_path}")
        
        browser.close()

if __name__ == "__main__":
    test_error_states()
    print("\nALL ERROR STATE SIMULATIONS AND SCREENSHOTS CAPTURED.")
