# India Cyber Crime Intelligence — upgraded project

## What was delivered

This is a professionally engineered upgrade of the existing *Big Data Fraud Detection for Crime and Law Enforcement Using Spark SQL* project (Phase 1), transforming it into a national cybercrime intelligence platform with a genuine interactive 3D India map, multi-section dashboard, and verified local geographic data — strictly upgrading the existing project, not replacing it.

## 1. Architecture & data foundations

- **GeoJSON boundaries:** `frontend/public/geo/india-states.geojson` — simplified file (5.1 MB, 452 outer rings, 115,954 vertices). The full-resolution archive is at `data/boundaries/geoBoundaries-IND-ADM1.geojson` (46 MB, preserved for audit, git-ignored).
- **Source of boundaries:** geoBoundaries (gbOpen, IND ADM1), derived from DataMeet India community maps and Election Commission of India boundary data.
- **Licence:** Creative Commons Attribution 2.5 India (**CC BY 2.5 IN**) — attribution retained in the Methodology section and README.
- **CRS:** `urn:ogc:def:crs:OGC:1.3:CRS84` (WGS84, GeoJSON default). No coordinates are altered or invented.
- **Coverage:** 36/36 jurisdictions (28 states + 8 Union Territories), MultiPolygon geometries with island parts preserved — Andaman and Nicobar Islands 187 parts, Lakshadweep 22, Puducherry 21, Dadra and Nagar Haveli and Daman and Diu 3. Verified against the authoritative dataset.
- **Dataset:** `data/statewise_cyber_crimes_2020_2024.csv` — NCRB *Crime in India* figures for 2020–2024 (36 jurisdictions, 7 years).
- **No external runtime dependency:** the GeoJSON is bundled with the app; the previous dependency on `https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson` has been removed.
- **Name-mapping layer:** Unicode NFD diacritic stripping + explicit alias table reconciles transliterated boundary names (`Mahārāshtra`, `Tamil Nādu`) with dataset ASCII names (`Maharashtra`, `Tamil Nadu`). 36/36 matched with zero problems. Mapping table at `data/boundaries/state_name_map.json`.
- **Backend API:** FastAPI + Spark SQL (`uvicorn backend.main:app`). Endpoint contracts preserved:
  - `GET /api/health` — service + engine status
  - `GET /api/years` — available reporting years
  - `GET /api/states?year=YYYY` — per-jurisdiction registered cases for a year
  - `GET /api/overview?year=YYYY` — national / state / UT totals, jurisdiction count
  - `GET /api/state/{state_name}` — five-year history for one jurisdiction
  - `GET /api/trends` — all-India totals per year
  - `GET /api/geo/india_states` — bundled boundary GeoJSON
- **All Spark SQL aggregations executed by the backend; the browser performs no statistical computation of its own.**

## 2. New dependencies (pinned, consistent)

| Dev | Runtime |
|---|---|
| `typescript 7.0.2` | `react 18.3.1` |
| `vite 8.3.8` | `react-dom 18.3.1` |
| `@vitejs/plugin-react 6.3.0` | `three 0.170.0` |
| `@types/react 18.3.12` | `@react-three/fiber 8.18.0` |
| | `@react-three/drei 9.122.0` |
| | `recharts 2.15.4` |
| | `framer-motion 11.18.2` |
| | `lucide-react 0.468.0` |

No `react-simple-maps` (was a leftover from the old SVG map). No glassmorphism, neon, random glows, gradient backgrounds, decorative elements or oversized empty sections.

## 3. Component summary

### Frontend source files (new/modified)

**New data layer:**
- `frontend/src/lib/api.ts` — typed API client for all 5 preserved endpoints + `/api/trends`
- `frontend/src/lib/geo.ts` — projection (spherical Mercator), name normalisation (diacritic stripping + alias table), geometry extraction

**New map modules:**
- `frontend/src/map/IndiaMap3D.tsx` — 3D choropleth Canvas with Three.js / React Three Fiber / React Three Drei, lighting/shadows, selectable/extruded state meshes, hover tooltip with registered cases, guided camera tour (manual start only), fly-to / zoom-to-fit, WebGL fallback
- `frontend/src/map/geometry.ts` — builds extruded geometries from projected GeoJSON, computes normalisation frame
- `frontend/src/map/StateMesh.tsx` — individual jurisdiction mesh with hover/selection shading
- `frontend/src/map/CameraRig.tsx` — eases camera toward goals with cubic easing; OrbitControls with sane limits
- `frontend/src/map/cameraStore.ts` — external camera command store (observable via `useSyncExternalStore`)
- `frontend/src/map/useMapData.ts` — loads GeoJSON once, projects features, generates extruded geometries once
- `frontend/src/map/lazy.ts` — code-splits three.js for on-demand loading

**New UI components:**
- `frontend/src/components/ui.tsx` — CountUp (respects `prefers-reduced-motion`), Metric (with decimals), SectionIndex, Reveal, Skeleton, Panel, MotionBar
- `frontend/src/components/Navigation.tsx` — side-nav section strip with state badge
- `frontend/src/components/Overview.tsx` — national totals, year picker, trend chart, ranking list, 3D map preview
- `frontend/src/components/StateIntelligence.tsx` — one reusable jurisdiction profile: name, category, case count, national ranking, share of national total, year-on-year comparison, 2020–2024 trend, comparison with national total, all-jurisdictions mini-table
- `frontend/src/components/NationalAnalytics.tsx` — five-year trend, state vs UT split, top 15 jurisdictions, distribution bands, year-wise comparison
- `frontend/src/components/DataExplorer.tsx` — search, type filter, sortable table, historical columns, CSV export of filtered rows
- `frontend/src/components/Methodology.tsx` — provenance, licence, separation of national vs demo vs original-prototype data, explicit statement of what figures are and are not

**New shell:**
- `frontend/src/App.tsx` — routing (Overview / Map / State Intelligence / National Analytics / Data Explorer / Methodology), global data loading, theme toggle, error boundaries, lazy-loaded 3D map, code-splitting for three.js

**New CSS:**
- `frontend/src/styles.css` — design tokens (`--bg/--panel/--panel2/--text/--muted/--border/--grid/--mapbg`), all component styles, reduced-motion media query, responsive breakpoints

### Tool scripts (new)

- `tools/validate_boundaries.py` — geometry/CRS/coverage validator (exit 0: 36/36 matched)
- `tools/build_name_map.py` — builds the GeoJSON→CSV name-mapping layer (36/36 matched)
- `tools/check_islands.py` — confirms island parts preserved
- `tools/report_vertices.py` — counts vertices/parts per jurisdiction
- `tools/e2e_check.py` — Playwright browser end-to-end suite (exit 0, zero console/page errors)
- `tools/VALIDATION.md` — detailed markdown validation report

## 4. Verification results

| Check | Result |
|---|---|
| TypeScript compile (`tsc -b`) | exit 0 |
| Production build (`vite build`) | exit 0; gzip bundle 730 KB main + 849 KB IndiaMap3D (code-split) |
| Boundary validation (`python tools/validate_boundaries.py`) | 36 features, 36/36 matched, 0 missing/unmatched/duplicates/invalid, CRS84 |
| Name mapping (`python tools/build_name_map.py`) | 36/36 matched |
| Island preservation (`python tools/check_islands.py`) | 187 / 22 / 21 / 3 parts confirmed |
| API smoke test (7 endpoints) | all return 200 with correct schema and data |
| E2E browser suite (`python tools/e2e_check.py`) | exit 0; all sections render, year selector changes figures, tour works, hover tooltip, click navigation, CSV export matches filter, theme toggle, responsive layouts, no console errors, share-metric 0.9 matching 0.9% |

**Key test outcomes:**
- 36 jurisdictions on the map, all selectable, island parts preserved
- Year selector changes every figure; figures always match the backend API
- Guided camera tour: manual start only (never auto-starts); navigation: previous/next/pause/resume/stop/reset all work; tour does not hijack navigation away from the map
- Hover tooltip shows jurisdiction name, category, and registered-case count
- Click selects a jurisdiction and flies the camera to it; State Intelligence dashboard opens
- CSV export produces exactly the filtered rows with the correct header
- All 6 sections (Overview / Map / State / Analytics / Explorer / Methodology) navigable via the side nav
- Theme toggle (light/dark) works
- Responsive: desktop full 3D; tablet adapted layout; mobile touch-friendly/simplified 3D fallback
- Share metric now renders 0.9% with CountUp(decimals=1) matching the backend value exactly

## 5. What figures represent — and do not represent

- **Registered cybercrime cases** per NCRB *Crime in India* (MHA/PIB 21 July 2026)
- **NOT** confirmed financial fraud transactions, individual complaints, convictions, financial losses, or recovered amounts
- **NOT** population-adjusted rates; a change in registered cases does not establish a change in underlying crime prevalence
- **NOT** a measure of population-adjusted risk
- Colours and elevation are relative to the highest reported jurisdiction in the selected year — visual only

## 6. What the platform does not contain

- No synthetic/demo data in the dashboard (the `data/demo/` CSVs exist only for the original Streamlit prototype and are never loaded by the React app)
- No hardcoded jurisdiction counts (28 / 8) — all counts derived from API responses
- No fictional/manual boundaries; every polygon is from the validated geoBoundaries source
- No external network dependency for map outlines after initial load
- No glassmorphism, neon glows, gradient backgrounds, decorative elements, oversized empty sections, or excessive animation

## 7. PowerShell start commands

```powershell
# 1. Start the backend (once, in a new PowerShell terminal)
cd C:\Users\srih8\Downloads\BigData-Fraud-Detection-India-Upgrade
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.main:app --reload --port 8000

# 2. Start the frontend (in a new PowerShell terminal)
cd C:\Users\srih8\Downloads\BigData-Fraud-Detection-India-Upgrade\frontend
npm install        # pinned React 18 + fiber 8 + drei 9 + three 0.170
npm run dev        # Vite dev server at http://localhost:5173

# 3. Open the application
#  http://localhost:5173

# 4. Optional: production build
#    cd frontend && npm run build   # tsc -b && vite build -> frontend/dist

# 5. Optional: run the original Streamlit prototype for comparison
#    streamlit run app.py   # preserves the earlier prototype unchanged
```

## 8. Final notes

- First backend query starts Spark and may take a little time on a cold start.
- If WebGL is unavailable, the map section shows a clear fallback instead of a blank canvas.
- The 3D map uses true Three.js extrusion (not a fabricated globe). Depth comes from extrusion height driven by the jurisdiction's registered-case count.
- The tour bar (guided camera tour) is **manual**: press Start to explore; it never auto-starts. Controls: pause / previous / next / stop / reset speed / reset camera.
- Attribution for map data: `geoBoundaries (gbOpen, IND ADM1), CC BY 2.5 IN, DataMeet India community / Election Commission of India`.
- Source for case data: NCRB, *Crime in India*; Ministry of Home Affairs / PIB 21 July 2026.