# Engineering & Product Decisions Record (docs/DECISIONS.md)

This log records architectural, algorithmic, visual, and data integrity decisions for the India Cyber Crime Intelligence Platform (ICIP).

---

## Decision 1: Unique "Survey Room" Cartographic Identity
- **Context**: The user explicitly instructed to avoid generic AI-generated dashboards (purple/teal gradients, cards-in-cards, glowing floating orbs) and avoid cloning Stripe directly, while achieving Stripe-level craftsmanship.
- **Decision**: Adopted the **"Survey Room"** design system — evoking an elite modern Survey of India geospatial intelligence center:
  - Deep slate/ink background (`#0A0D10` / `#10151A`).
  - Warm signal amber (`#F2A33A`) for focus, selections, and active markers.
  - Sequential, color-blind-safe 5-step choropleth ramp (`#17262E` → `#2B6F73` → `#C9BE94` → `#EE9B3A` → `#D6452F`).
  - Subdued, non-distracting topographic contour lines with subtle parallax.
  - Instrument Serif / Geist / Geist Mono typography.

---

## Decision 2: Jurisdiction Identity via Stable Codes (ISO 3166-2:IN / LGD)
- **Context**: Previous name-based joining caused mismatches (e.g., "Delhi" vs "NCT of Delhi", "Andaman & Nicobar Islands" vs "A & N Islands", "Telangana" vs "Andhra Pradesh").
- **Decision**: All API responses, GeoJSON properties, state meshes, table rows, and selection stores join strictly on standardized jurisdiction codes (e.g., `IN-TG`, `IN-KA`, `IN-DL`, `IN-MH`). Name variants are normalized at ingestion time and never used as primary keys.

---

## Decision 3: Map Extrusion Height Function
- **Context**: Linear height scaling (`h = k * value`) created massive vertical occlusion walls for states with >20,000 cases (e.g. Karnataka, Telangana, Maharashtra), blocking neighboring states.
- **Decision**: Implemented square-root height scaling:
  $$h = \text{base} + k \cdot \sqrt{\frac{\text{cases}}{\text{max\_cases}}}$$
  where $\text{base} \approx 0.02$, $\text{max\_height} \approx 0.07 \times \text{map\_span}$. Small UTs receive a minimum visible elevation threshold so they remain selectable from any angle.

---

## Decision 4: Zero Spatial Smoothing or Interpolation
- **Context**: State borders represent administrative legal jurisdictions. Any kriging, inverse-distance weighting, or blur between states represents false data.
- **Decision**: Each state geometry is extruded as a distinct, flat-topped prism whose height and color derive strictly from its own police FIR count for the selected year. Borders remain crisp with inset LineSegments.

---

## Decision 5: Multi-Year Spark SQL Aggregation Pipeline
- **Context**: The Data Explorer previously lacked multi-year data, rendering "—" in historical columns.
- **Decision**: Created `/api/matrix` powered by Apache Spark SQL returning the full 36-jurisdiction × 5-year matrix (2020–2024), including derived YoY deltas, CAGR, and percentage shares, cached in-memory on the FastAPI server for sub-50ms query latency.

---

## Decision 6: Full-Bleed 3D Cockpit with Floating Glass HUDs
- **Context**: Previously, a 300px hero text box pushed the 3D map down into a cramped container.
- **Decision**: Converted the 3D map section to a full-bleed viewport (`height: calc(100vh - 71px)`), superimposing floating translucent glass HUDs on the 4 corners:
  - Top-Left: Operational Mission Status & Total National FIR count.
  - Top-Right: Camera Presets & 3D visualization switchers.
  - Bottom-Left: Choropleth density spectrum with numeric stops.
  - Bottom-Right: Selected Jurisdiction tactical dossier card.
