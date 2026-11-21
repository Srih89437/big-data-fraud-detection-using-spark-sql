"""
Record high-definition video of the ICIP Landing Page and App Navigation.
Demonstrates:
- Landing Page hero & contours
- Dot matrix India hover / parallax
- Scrolling through scale strip & state picker
- Navigating to /app/map and switching 3D modes
- Navigating to /app/state/TG (State Dossier)
Saves video to qa/video/
"""
import os
import time
from playwright.sync_api import sync_playwright

VIDEO_DIR = os.path.abspath("qa/video")
os.makedirs(VIDEO_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1440, "height": 900},
        record_video_dir=VIDEO_DIR,
        record_video_size={"width": 1440, "height": 900},
    )
    page = context.new_page()

    # 1. Landing Page
    print("Navigating to Landing Page...")
    page.goto("http://127.0.0.1:5173/", wait_until="networkidle")
    time.sleep(2.5)

    # Hover pointer across hero to trigger dot matrix / contour parallax
    page.mouse.move(300, 300)
    time.sleep(0.5)
    page.mouse.move(800, 400)
    time.sleep(0.8)
    page.mouse.move(1100, 350)
    time.sleep(1.0)

    # Scroll down to scale strip
    scale_strip = page.query_selector("#scale-strip")
    if scale_strip:
        scale_strip.scroll_into_view_if_needed()
        time.sleep(1.5)

    # Scroll down to state profiles
    states_sec = page.query_selector("#states")
    if states_sec:
        states_sec.scroll_into_view_if_needed()
        time.sleep(1.5)
        # Click Karnataka chip
        ka_chip = page.query_selector("button:has-text('KA')")
        if ka_chip:
            ka_chip.click()
            time.sleep(1.5)

    # 2. Click sidebar to go to India 3D Map
    print("Navigating to India 3D Map...")
    map_nav = page.query_selector("button:has-text('India 3D Map')")
    if map_nav:
        map_nav.click()
    else:
        page.keyboard.press("2")
    time.sleep(3.0)

    # Click on quick jump hotspot (Telangana)
    tg_btn = page.query_selector("button:has-text('Telangana')")
    if tg_btn:
        tg_btn.click()
        time.sleep(2.0)

    # Switch 3D view mode to Column
    page.wait_for_timeout(2000)
    col_btn = page.query_selector("button:has-text('Column')")
    if col_btn:
        try:
            col_btn.click(force=True)
            time.sleep(2.0)
        except Exception:
            pass

    # 3. Navigate to State Dossier
    print("Navigating to State Dossier...")
    page.goto("http://127.0.0.1:5173/app/state/TG", wait_until="networkidle")
    time.sleep(2.5)

    context.close()
    browser.close()

print("Video recording complete!")
