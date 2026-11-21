"""
Record short video of page transition and 3D map state click.
Saves to qa/video/
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
    page.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(2)

    # Transition to Map
    page.keyboard.press("2")
    time.sleep(2.5)

    # Click on quick jump hotspot (Telangana or Karnataka)
    tg_btn = page.query_selector("button:has-text('Telangana')")
    if tg_btn:
        tg_btn.click()
        time.sleep(2)

    # Switch 3D view mode to Column
    col_btn = page.query_selector("button:has-text('Column')")
    if col_btn:
        col_btn.click()
        time.sleep(2)

    context.close()
    browser.close()
print("Video recorded successfully!")
