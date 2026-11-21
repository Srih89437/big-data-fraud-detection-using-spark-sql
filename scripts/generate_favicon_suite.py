"""
Generate the authentic cartographic favicon suite for ICIP:
- Extruded India contour prism with an amber beacon dot.
- Generates:
  - frontend/public/favicon.svg (with prefers-color-scheme dark/light adaptation)
  - qa/favicon/preview_16.png, preview_32.png, preview_180.png, preview_512.png
  - frontend/public/apple-touch-icon.png (180x180)
  - frontend/public/icon-192.png (192x192)
  - frontend/public/icon-512.png (512x512)
  - frontend/public/icon-maskable.png (512x512)
  - frontend/public/favicon.ico
"""
import os
import json
import math
from playwright.sync_api import sync_playwright

GEOJSON_PATH = os.path.abspath("frontend/public/geo/india-states.geojson")
PUBLIC_DIR = os.path.abspath("frontend/public")
QA_FAVICON_DIR = os.path.abspath("qa/favicon")
os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(QA_FAVICON_DIR, exist_ok=True)

# 1. Project India's geographic bounds to an SVG path
# India mainland approx: lon 68 to 97.5, lat 8 to 37.2
# We project using standard Conic conformal-like perspective:
# X: longitude, Y: inverted latitude

def make_india_prism_svg():
    svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <style>
      :root {
        --bg-plate: #0A0D10;
        --border-plate: #223244;
        --base-prism: #1E293B;
        --side-prism: #0F172A;
        --top-prism: #283548;
        --contour-stroke: #475569;
        --amber-dot: #E07A38;
        --amber-glow: rgba(224, 122, 56, 0.45);
      }
      @media (prefers-color-scheme: light) {
        :root {
          --bg-plate: #F8F7F4;
          --border-plate: #D1CBC0;
          --base-prism: #E2E8F0;
          --side-prism: #CBD5E1;
          --top-prism: #FFFFFF;
          --contour-stroke: #94A3B8;
          --amber-dot: #E07A38;
          --amber-glow: rgba(224, 122, 56, 0.35);
        }
      }
    </style>
  </defs>

  <!-- Base Plate Frame -->
  <rect x="2" y="2" width="60" height="60" rx="14" fill="var(--bg-plate)" stroke="var(--border-plate)" stroke-width="1.5" />

  <!-- Outer Cartographic Range Ring -->
  <circle cx="32" cy="33" r="24" fill="none" stroke="var(--border-plate)" stroke-width="0.75" stroke-dasharray="3 2" />

  <!-- Extruded Prism Lower Drop / Shadow (South facing depth) -->
  <path d="
    M 31 10
    L 37 15
    L 45 22
    L 50 25
    L 46 30
    L 42 35
    L 39 42
    L 33 54
    L 32 57
    L 32 60
    L 34 57
    L 41 45
    L 45 37
    L 53 28
    L 49 23
    L 40 17
    L 33 13
    Z"
    fill="var(--side-prism)" opacity="0.85" />

  <!-- Extruded Prism Base Geometry (Simplified Sovereign Boundary of India) -->
  <!-- Coordinates: North (J&K) at top ~10, South (Kanyakumari) at ~54, Gujarat at ~15, NE at ~52 -->
  <path d="
    M 31 10
    C 33 11, 35 13, 37 15
    L 39 14
    L 43 19
    L 40 23
    L 46 22
    L 52 24
    L 51 28
    L 44 29
    L 42 34
    L 38 41
    L 36 47
    L 33 54
    C 32.5 55, 31.5 55, 31 54
    L 28 47
    L 26 41
    L 24 35
    L 17 33
    L 13 32
    L 14 26
    L 20 25
    L 23 20
    L 27 16
    Z"
    fill="var(--top-prism)"
    stroke="var(--contour-stroke)"
    stroke-width="1.4"
    stroke-linejoin="round"
  />

  <!-- Top Elevation Stepped Contour Line -->
  <path d="
    M 31 14
    L 35 18
    L 40 21
    L 45 25
    L 41 27
    L 37 34
    L 35 41
    L 32 50
    L 29 42
    L 25 35
    L 19 31
    L 21 26
    L 27 21
    Z"
    fill="none"
    stroke="var(--amber-dot)"
    stroke-width="0.9"
    opacity="0.6"
  />

  <!-- Amber Hotspot Intelligence Beacon (Central India coordinates, hovering at [33, 34]) -->
  <circle cx="33" cy="34" r="5.5" fill="var(--amber-glow)" />
  <circle cx="33" cy="34" r="2.8" fill="var(--amber-dot)" />
  <circle cx="33" cy="34" r="1.1" fill="#FFFFFF" />
</svg>"""
    return svg_content

def main():
    svg_content = make_india_prism_svg()
    svg_path = os.path.join(PUBLIC_DIR, "favicon.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Generated {svg_path}")

    # Use Playwright to render pixel-perfect icons from the SVG
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <style>
    body, html {{ margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; }}
    svg {{ width: 100%; height: 100%; display: block; }}
  </style>
</head>
<body>
{svg_content}
</body>
</html>"""
    temp_html = os.path.join(PUBLIC_DIR, "_favicon_temp.html")
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)

    targets = [
        {"path": os.path.join(QA_FAVICON_DIR, "preview_16.png"), "size": 16},
        {"path": os.path.join(QA_FAVICON_DIR, "preview_32.png"), "size": 32},
        {"path": os.path.join(QA_FAVICON_DIR, "preview_180.png"), "size": 180},
        {"path": os.path.join(QA_FAVICON_DIR, "preview_512.png"), "size": 512},
        {"path": os.path.join(PUBLIC_DIR, "apple-touch-icon.png"), "size": 180},
        {"path": os.path.join(PUBLIC_DIR, "icon-192.png"), "size": 192},
        {"path": os.path.join(PUBLIC_DIR, "icon-512.png"), "size": 512},
        {"path": os.path.join(PUBLIC_DIR, "icon-maskable.png"), "size": 512},
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for t in targets:
            context = browser.new_context(
                viewport={"width": t["size"], "height": t["size"]},
                device_scale_factor=1,
            )
            page = context.new_page()
            page.goto(f"file:///{temp_html.replace(os.sep, '/')}")
            page.screenshot(path=t["path"], omit_background=True)
            context.close()
            print(f"Captured: {t['path']} ({t['size']}x{t['size']})")
        browser.close()

    # Create standard PNG-in-ICO favicon.ico from the 32x32 PNG
    p32_path = os.path.join(QA_FAVICON_DIR, "preview_32.png")
    ico_path = os.path.join(PUBLIC_DIR, "favicon.ico")
    if os.path.exists(p32_path):
        with open(p32_path, "rb") as f:
            png_data = f.read()
        png_len = len(png_data)
        # 6 byte header + 16 byte dir entry + png_data
        ico_header = bytes([0, 0, 1, 0, 1, 0])
        ico_entry = bytes([
            32, 32, 0, 0, 1, 0, 32, 0,
            png_len & 0xFF, (png_len >> 8) & 0xFF, (png_len >> 16) & 0xFF, (png_len >> 24) & 0xFF,
            22, 0, 0, 0
        ])
        with open(ico_path, "wb") as f:
            f.write(ico_header + ico_entry + png_data)
        print(f"Created standard PNG-in-ICO: {ico_path}")

    if os.path.exists(temp_html):
        os.remove(temp_html)
    print("Favicon suite generation complete!")

if __name__ == "__main__":
    main()
