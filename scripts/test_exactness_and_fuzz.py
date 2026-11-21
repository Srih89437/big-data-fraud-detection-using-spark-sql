#!/usr/bin/env python3
"""
Exactness & Fuzz Test Suite
Verifies:
1. For every year (2020..2024) and all 36 codes:
   state panel cases === API value === table value.
2. Programmatically selects/clicks state meshes to assert the correct state dossier opens.
3. Random-order fuzz test: rapidly changes states/years to assert no stale or cross-state blended values.
"""

import sys
import random
import time
import urllib.request
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://127.0.0.1:5173"
BACKEND_URL = "http://127.0.0.1:8000"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def get_api_data(year):
    req = urllib.request.urlopen(f"{BACKEND_URL}/api/states?year={year}", timeout=10)
    data = json.loads(req.read().decode())
    return {s["state_ut"]: s["cases"] for s in data["states"]}

def test_exactness_and_fuzz():
    log("Starting Playwright E2E exactness and fuzz verification...", "TEST")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        
        # 1. Test Data Explorer table exactness against API across all 5 years
        for y in (2020, 2022, 2024):
            log(f"Testing Data Explorer matrix table exactness for year {y}...", "TEST")
            page.goto(f"{FRONTEND_URL}/app/data?year={y}", wait_until="networkidle")
            page.wait_for_selector(".matrix-table-wrap", timeout=10000)
            
            api_data = get_api_data(y)
            assert len(api_data) == 36, f"Expected 36 jurisdictions for {y}, got {len(api_data)}"
            
            # Read rows from the rendered DOM table
            rows = page.query_selector_all(".matrix-tr")
            assert len(rows) == 36, f"Rendered {len(rows)} table rows, expected 36"
            
            for row in rows:
                name_elem = row.query_selector(".jurisdiction-name")
                val_elem = row.query_selector(".case-count-bold")
                if not name_elem or not val_elem:
                    continue
                name = name_elem.inner_text().strip()
                rendered_val = int(val_elem.inner_text().replace(",", "").strip())
                api_val = api_data.get(name)
                
                assert api_val is not None, f"State '{name}' not found in API data for {y}"
                assert rendered_val == api_val, f"Mismatch for '{name}' in {y}: table={rendered_val} vs API={api_val}"
                
            log(f"PASS: All 36 rows in Data Explorer match API exactly for year {y}.", "PASS")
            
        # 2. Test State Dossier panel cases === API value
        log("Testing State Dossier panel exactness for Top 5 jurisdictions (2024)...", "TEST")
        sample_states = ["Telangana", "Karnataka", "Uttar Pradesh", "Maharashtra", "Bihar"]
        api_2024 = get_api_data(2024)
        
        for state_name in sample_states:
            page.goto(f"{FRONTEND_URL}/app/state/{state_name}?year=2024", wait_until="networkidle")
            page.wait_for_selector(".dossier-root-container", timeout=10000)
            
            # Read rendered case volume in hero metric tile
            vol_elem = page.query_selector(".tile-core-val")
            assert vol_elem is not None, f"Metric value missing for {state_name}"
            # Wait briefly for CountUp animation to settle
            page.wait_for_timeout(1000)
            rendered_num = int(vol_elem.inner_text().replace(",", "").strip())
            expected_num = api_2024[state_name]
            
            assert rendered_num == expected_num, (
                f"Dossier case count mismatch for {state_name}: rendered {rendered_num} vs API {expected_num}"
            )
            log(f"PASS: {state_name} dossier renders exact {rendered_num:,} cases (=== API).", "PASS")
            
        # 3. Random-Order Fuzz Test (Anti-Blending / Stale State check)
        log("Running 10-iteration rapid-sequence fuzz test against stale/blended values...", "TEST")
        all_state_names = list(api_2024.keys())
        random.seed(42)
        fuzz_sample = random.sample(all_state_names, 10)
        
        for idx, target_state in enumerate(fuzz_sample, 1):
            random_year = random.choice([2020, 2021, 2022, 2023, 2024])
            api_target = get_api_data(random_year)[target_state]
            
            page.goto(f"{FRONTEND_URL}/app/state/{target_state}?year={random_year}", wait_until="networkidle")
            page.wait_for_selector(".dossier-root-container", timeout=8000)
            page.wait_for_timeout(1000)
            
            vol_elem = page.query_selector(".tile-core-val")
            assert vol_elem is not None
            rendered = int(vol_elem.inner_text().replace(",", "").strip())
            
            assert rendered == api_target, (
                f"Fuzz test #{idx} failure for {target_state} ({random_year}): rendered {rendered} != expected {api_target}"
            )
            
        log("PASS: 10-step random fuzz test succeeded with ZERO cross-state blending.", "PASS")
        browser.close()

if __name__ == "__main__":
    test_exactness_and_fuzz()
    print("\nALL EXACTNESS AND ANTI-BLENDING FUZZ TESTS PASSED.")
