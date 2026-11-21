# Visual QA, Evidence & Iteration Audit

## Executive Summary
This document provides empirical evidence from automated Playwright browser test executions against the running application at `http://localhost:5173/`, cross-verifying the design, typography, 3D cartographic projection, interactive motion, and data fidelity against the master prompt requirements.

---

## 1. Font Verification Proof (`document.fonts.check`)

Verified live via Chromium browser runtime:
```json
{
  "instrumentSerif": true,
  "geistSans": true,
  "geistMono": true,
  "loadedFonts": [
    "Instrument Serif 400",
    "Geist Sans 400",
    "Geist Sans 500",
    "Geist Sans 600",
    "Geist Mono 400",
    "Geist Mono 500",
    "Geist Mono 600"
  ]
}
```
- **Headings & Titles**: Rendering in `Instrument Serif` (e.g. *CENTRAL JURISDICTION MATRIX*, *Overview*, *State Dossier*).
- **Body & UI**: Rendering in `Geist Sans` with crisp kerning and zero generic font fallback.
- **Numbers & Metrics**: Rendering in `Geist Mono` with `tabular-nums` alignment (e.g. `1,01,928`, `27,230`).

---

## 2. Before / After Visual Comparison

| Route | Baseline (`qa/baseline/`) | New Cartographic Identity (`qa/after/`) | Visual Observations |
| :--- | :--- | :--- | :--- |
| **Overview** | `qa/baseline/desktop_overview.png` | `qa/after/desktop_overview.png` | Removed Stripe blurple accents (`#635BFF`); replaced with Sovereign Saffron (`#E07A38`) and Obsidian Slate (`#0A0D10`). No card-in-card nesting. Clean editorial composition. |
| **3D India Map** | `qa/baseline/desktop_map.png` | `qa/after/desktop_map.png` | **Inversion Fixed**: North-up orientation (J&K top, TN/Kerala bottom). Polylabel centroids ensure labels sit cleanly on meshes. Square-root elevation prevents occluding skyscraper walls. |
| **State Dossier** | `qa/baseline/desktop_state.png` | `qa/after/desktop_state.png` | Dedicated confidential dossier layout with longitudinal trend line, FIR classification breakdown, and zero mock metrics. |
| **National Analytics** | `qa/baseline/desktop_analytics.png` | `qa/after/desktop_analytics.png` | Asymmetric layout with longitudinal trajectory charts, YoY growth indicators, and national crime concentration metrics. |
| **Data Explorer** | `qa/baseline/desktop_explorer.png` | `qa/after/desktop_explorer.png` | Real 2020–2024 annual columns, instant search/filtering, inline SVG mini-sparklines, dual CSV/JSON export. Sourced from `/api/matrix`. |
| **Dataset Studio** | `qa/baseline/desktop_studio.png` | `qa/after/desktop_studio.png` | Canvas occupies ≥75% of viewport width. Full column profiling with cardinality ratios, geographic auto-detection, and 6 active 3D visualization modes. |
| **Methodology** | `qa/baseline/desktop_methodology.png` | `qa/after/desktop_methodology.png` | Detailed NCRB provenance gazette notice, FIR legal interpretation advisory, and Spark SQL query pipeline architecture. |

---

## 3. 3D Map Verification Checklist

- [x] **North-Up Orientation**: Standard Survey of India Lambert Conic Conformal projection (`d3.geoConicConformal`).
- [x] **36 Selectable Jurisdictions**: 28 States and 8 Union Territories with individual geometries and raycast hit detection.
- [x] **Square-Root Height Elevation**: Elevation formula: `0.04 + 0.61 * sqrt(ratio)` prevents occluding skyscraper walls.
- [x] **Labels on Meshes**: Centroid placement computed via `@mapbox/polylabel` (true polygon interior, not offshore bounding box center).
- [x] **Hover Lift & Tooltip**: Subtle 3D lift (`+0.04 Y`) on pointer hover with tooltip displaying exact cases and national percentage.
- [x] **Camera Fly & Dossier Drawer**: Clicking a state triggers smooth camera pan/zoom into jurisdiction with sliding tactical dossier drawer.
- [x] **4 Interactive 3D Modes**:
  1. **3D Prism** (`qa/after/desktop_map.png`)
  2. **Column** (`qa/after/desktop_map_mode_column.png`)
  3. **Bubble Cluster** (`qa/after/desktop_map_mode_bubble.png`)
  4. **Bar Matrix** (`qa/after/desktop_map_mode_barmatrix.png`)
- [x] **5-Year Time-Lapse Player**: Play/Pause button with year scrubbers (2020–2024) and smooth state-transition animations.
- [x] **Side-by-Side Compare Mode** (`qa/after/desktop_map_compare_mode.png`): Side-by-side comparison of two jurisdictions with delta calculations and rank differentials.
- [x] **Tour Deck & Compass**: Guided tour cycling top hotspot jurisdictions; cartographic compass pointing True North.

---

## 4. Favicon Suite Verification

- Mark: Extruded India contour prism with central glowing amber beacon dot (`#E07A38`).
- Dark/Light mode adaptive SVG: `frontend/public/favicon.svg` (uses `@media (prefers-color-scheme: dark)`).
- Full icon suite generated:
  - `qa/favicon/preview_16.png` (16×16)
  - `qa/favicon/preview_32.png` (32×32)
  - `qa/favicon/preview_180.png` (180×180)
  - `qa/favicon/preview_512.png` (512×512)
  - `frontend/public/apple-touch-icon.png`
  - `frontend/public/icon-192.png`
  - `frontend/public/icon-512.png`
  - `frontend/public/icon-maskable.png`
  - `frontend/public/favicon.ico`

---

## 5. Recorded Motion & Video Walkthrough

Recorded via Playwright Chromium into `qa/video/`:
- **Page Transition**: Smooth fade-and-slide transition with reduced motion compliance (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **State Selection**: Smooth camera arc flight to Telangana with dynamic reticle beacon.
- **3D Mode Switch**: Seamless switch from Prism extrusion to vertical 3D Columns.
