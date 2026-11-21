"""
Generate the authentic cartographic favicon suite and OG social image for ICIP:
- Extruded India contour prism with an amber beacon dot.
- Generates:
  - frontend/public/favicon.svg (with prefers-color-scheme dark/light adaptation)
  - qa/favicon/preview_16.png, preview_32.png, preview_180.png, preview_512.png
  - frontend/public/apple-touch-icon.png (180x180)
  - frontend/public/icon-192.png (192x192)
  - frontend/public/icon-512.png (512x512)
  - frontend/public/icon-maskable.png (512x512)
  - frontend/public/favicon.ico
  - frontend/public/og-image.png (1200x630)
"""
import os
import json
import math
from playwright.sync_api import sync_playwright

PUBLIC_DIR = os.path.abspath("frontend/public")
QA_FAVICON_DIR = os.path.abspath("qa/favicon")
os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(QA_FAVICON_DIR, exist_ok=True)

def make_india_prism_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <style>
      :root {
        --bg-plate: #0A0D10;
        --border-plate: #223244;
        --base-prism: #1E293B;
        --side-prism: #0F172A;
        --top-prism: #1E293B;
        --contour-stroke: #E07A38;
        --amber-dot: #E07A38;
        --amber-glow: rgba(224, 122, 56, 0.5);
      }
      @media (prefers-color-scheme: light) {
        :root {
          --bg-plate: #F3F0E8;
          --border-plate: #D1CBC0;
          --base-prism: #E2E8F0;
          --side-prism: #CBD5E1;
          --top-prism: #FFFFFF;
          --contour-stroke: #E07A38;
          --amber-dot: #E07A38;
          --amber-glow: rgba(224, 122, 56, 0.4);
        }
      }
    </style>
  </defs>

  <!-- Base Plate Frame -->
  <rect x="2" y="2" width="60" height="60" rx="14" fill="var(--bg-plate)" stroke="var(--border-plate)" stroke-width="2" />

  <!-- Outer Cartographic Range Ring -->
  <circle cx="32" cy="33" r="25" fill="none" stroke="var(--border-plate)" stroke-width="1.2" stroke-dasharray="3 3" />

  <!-- Extruded Prism Lower Depth Shadow -->
  <path d="
    M 31 10
    L 37 15
    L 45 22
    L 52 24
    L 48 30
    L 42 35
    L 39 42
    L 33 54
    L 32 58
    L 34 56
    L 41 45
    L 46 37
    L 54 27
    L 50 23
    L 40 17
    L 33 12
    Z"
    fill="var(--side-prism)" opacity="0.9" />

  <!-- Extruded Prism Boundary Geometry of India -->
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
    stroke-width="2.2"
    stroke-linejoin="round"
  />

  <!-- Stepped Elevation Contour Ring -->
  <path d="
    M 31 15
    L 35 19
    L 40 22
    L 45 26
    L 41 28
    L 37 35
    L 35 42
    L 32 50
    L 29 42
    L 25 35
    L 19 31
    L 21 26
    L 27 21
    Z"
    fill="none"
    stroke="#F2A33A"
    stroke-width="1.2"
    stroke-dasharray="2 2"
    opacity="0.8"
  />

  <!-- Amber Hotspot Intelligence Beacon -->
  <circle cx="32" cy="33" r="6.5" fill="var(--amber-glow)" />
  <circle cx="32" cy="33" r="3.5" fill="var(--amber-dot)" />
  <circle cx="32" cy="33" r="1.4" fill="#FFFFFF" />
</svg>"""

def make_og_html():
    return """<!DOCTYPE html>
<html>
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;600;700&family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
    body, html { margin: 0; padding: 0; width: 1200px; height: 630px; background: #0A0D10; color: #FFFFFF; font-family: 'Geist', sans-serif; overflow: hidden; }
    .og-wrap {
      width: 1200px;
      height: 630px;
      box-sizing: border-box;
      padding: 64px 72px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      background: radial-gradient(circle at 80% 30%, rgba(224, 122, 56, 0.12) 0%, transparent 60%), #0A0D10;
    }
    .og-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      padding: 6px 16px;
      font-family: 'Geist Mono', monospace;
      font-size: 13px;
      letter-spacing: 0.06em;
      color: #E07A38;
      width: fit-content;
    }
    .badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #E07A38; }
    .og-title {
      font-family: 'Instrument Serif', serif;
      font-size: 64px;
      line-height: 1.1;
      font-weight: 400;
      color: #FFFFFF;
      margin: 20px 0 16px 0;
      max-width: 820px;
      letter-spacing: -0.015em;
    }
    .og-desc {
      font-size: 20px;
      line-height: 1.45;
      color: #94A3B8;
      max-width: 760px;
      margin: 0;
    }
    .og-metrics {
      display: flex;
      gap: 36px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 28px;
    }
    .metric-col { display: flex; flex-direction: column; gap: 4px; }
    .metric-num { font-family: 'Geist Mono', monospace; font-size: 32px; font-weight: 700; color: #FFFFFF; }
    .metric-lbl { font-size: 13px; color: #64748B; letter-spacing: 0.04em; text-transform: uppercase; font-family: 'Geist Mono', monospace; }
    .og-mark {
      position: absolute;
      right: 72px;
      top: 140px;
      width: 280px;
      height: 280px;
      opacity: 0.85;
    }
  </style>
</head>
<body>
  <div class="og-wrap">
    <div>
      <div class="og-badge">
        <span class="badge-dot"></span>
        NATIONAL OBSERVATORY · APACHE SPARK SQL 3.5
      </div>
      <h1 class="og-title">India Cyber Crime Intelligence Platform</h1>
      <p class="og-desc">
        National 3D Geospatial Observatory & Multi-Year Empirical Intelligence Matrix across 36 Jurisdictions (2020–2024).
      </p>
    </div>

    <div class="og-metrics">
      <div class="metric-col">
        <span class="metric-num">1,01,928</span>
        <span class="metric-lbl">Total Registered FIRs (2024)</span>
      </div>
      <div class="metric-col">
        <span class="metric-num">36</span>
        <span class="metric-lbl">Administrative Jurisdictions</span>
      </div>
      <div class="metric-col">
        <span class="metric-num">+17.9%</span>
        <span class="metric-lbl">National YoY Escalation</span>
      </div>
      <div class="metric-col">
        <span class="metric-num">75.1%</span>
        <span class="metric-lbl">Top 5 Concentration</span>
      </div>
    </div>

    <div class="og-mark">
""" + make_india_prism_svg() + """
    </div>
  </div>
</body>
</html>"""

def main():
    svg_content = make_india_prism_svg()
    svg_path = os.path.join(PUBLIC_DIR, "favicon.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Generated {svg_path}")

    # Render icons from the SVG
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

    # OG Image
    og_html_content = make_og_html()
    temp_og = os.path.join(PUBLIC_DIR, "_og_temp.html")
    with open(temp_og, "w", encoding="utf-8") as f:
        f.write(og_html_content)

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

        # Capture OG Image (1200x630)
        og_context = browser.new_context(
            viewport={"width": 1200, "height": 630},
            device_scale_factor=1,
        )
        og_page = og_context.new_page()
        og_page.goto(f"file:///{temp_og.replace(os.sep, '/')}")
        og_out = os.path.join(PUBLIC_DIR, "og-image.png")
        og_page.screenshot(path=og_out)
        og_context.close()
        print(f"Captured OG Image: {og_out} (1200x630)")

        browser.close()

    # Create standard PNG-in-ICO favicon.ico from 32x32 PNG
    p32_path = os.path.join(QA_FAVICON_DIR, "preview_32.png")
    ico_path = os.path.join(PUBLIC_DIR, "favicon.ico")
    if os.path.exists(p32_path):
        with open(p32_path, "rb") as f:
            png_data = f.read()
        png_len = len(png_data)
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
    if os.path.exists(temp_og):
        os.remove(temp_og)
    print("Favicon & OG suite generation complete!")

if __name__ == "__main__":
    main()
