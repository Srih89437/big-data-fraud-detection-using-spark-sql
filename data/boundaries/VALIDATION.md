# Geographic data validation report

Generated for the upgrade of *Big Data Fraud Detection for Crime and Law Enforcement Using Spark SQL*.
Machine-readable evidence lives beside this file:

| File | Contents |
|---|---|
| `validation_report_simplified.json` | Validation of the bundled file (the one the app ships) |
| `validation_report_full.json` | Validation of the archived full-resolution file |
| `state_name_map.json` | GeoJSON name → dataset jurisdiction name mapping (36 entries) |
| `e2e_report.json` | Browser end-to-end run (`tools/e2e_check.py`) |
| `geoBoundaries-IND-ADM1_simplified.geojson` | Source of `frontend/public/geo/india-states.geojson` |
| `geoBoundaries-IND-ADM1.geojson` | Full-resolution archive (46 MB, git-ignored, reproducible) |

## 1. Provenance

- **Source:** geoBoundaries, release `gbOpen`, boundary set `IND` at `ADM1`.
  - Full resolution: `https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IND/ADM1/geoBoundaries-IND-ADM1.geojson`
  - Simplified: same path with `_simplified.geojson`
- **Underlying data:** DataMeet India community maps, built from Election Commission of India boundary data (`github.com/datameet/maps`).
- **Licence:** Creative Commons Attribution 2.5 India (**CC BY 2.5 IN**). Attribution is carried in the app's Methodology section and in the project README.
- **CRS:** `urn:ogc:def:crs:OGC:1.3:CRS84` (WGS84 longitude/latitude, the GeoJSON default). Confirmed present in the file header, not assumed.
- **Rejection of the previous source:** the runtime dependency on `https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson` was removed. That file has only **35 features**, omits Ladakh, Telangana, Uttarakhand, Andaman and Nicobar Islands, and Dadra and Nagar Haveli and Daman and Diu, and uses legacy names (`Orissa`, `Uttaranchal`). It cannot satisfy 36-jurisdiction coverage.

## 2. Coverage — 36 of 36

Run: `python tools/validate_boundaries.py`

| Check | Simplified (shipped) | Full (archive) |
|---|---|---|
| Features | 36 | 36 |
| Matched to dataset jurisdictions | **36** | **36** |
| Missing on map | 0 | 0 |
| Unmatched / orphan features | 0 | 0 |
| Duplicate features | 0 | 0 |
| Invalid geometries | 0 | 0 |
| CRS | CRS84 | CRS84 |
| Exit code | 0 | 0 |

Classification produced by the client's mapping layer: **28 states + 8 Union Territories**.

## 3. Geometry integrity

Run: `python tools/check_islands.py`, `python tools/report_vertices.py`

- Shipped file: **5,103,747 bytes**, **452 outer rings**, **115,954 vertices**.
- Archive file: 46,170,854 bytes, 1,055,284 vertices (too heavy to parse in a browser; retained as source evidence only).
- MultiPolygon parts are preserved, not flattened to a single ring:

| Jurisdiction | Polygon parts |
|---|---|
| Andaman and Nicobar Islands | 187 |
| West Bengal | 123 |
| Tamil Nadu | 41 |
| Lakshadweep | 22 |
| Puducherry | 21 |
| Gujarat | 13 |
| Dadra and Nagar Haveli and Daman and Diu | 3 |

- Union bbox in projected metres converts back to **lon 68.09° … 97.41°, lat ≈ 6.79° … 37.11°**, i.e. inside India's expected extent — the projection is not shifted or mirrored.
- **No boundary was generated, approximated or synthesised anywhere in this project.** Every polygon is read from the downloaded file.

## 4. Name-mapping layer

Two different namings had to be reconciled:

- geoBoundaries writes transliterated names: `Mahārāshtra`, `Tamil Nādu`, `Ladākh`, `Dādra and Nagar Haveli and Damān and Diu`, `Telangāna`, `Uttarākhand`.
- The dataset (`data/statewise_cyber_crimes_2020_2024.csv`) and every API response use ASCII names: `Maharashtra`, `Tamil Nadu`, `Ladakh`, …

`frontend/src/lib/geo.ts` resolves this with Unicode NFD diacritic stripping plus a small alias table (`Orissa`→`Odisha`, `Uttaranchal`→`Uttarakhand`, `NCT of Delhi`→`Delhi`, …), then maps onto the canonical dataset name. `tools/build_name_map.py` performs the same reconciliation offline and writes `state_name_map.json`.

**Result: 36/36 matched, 0 missing, 0 unmatched, 0 duplicates.** Verified against the real TypeScript module (transpiled and executed against the shipped GeoJSON and the CSV), not a re-implementation.

Because of this, the map, the ranking list, the Data Explorer table and the `GET /api/state/{name}` call all share one identifier per jurisdiction.

## 5. What the bundled data does *not* tell you

- Registered cybercrime **cases** are not fraud transactions, complaints, convictions, losses or recovered amounts.
- Counts are not population-adjusted rates; a higher count does not establish a higher underlying rate.
- Boundaries are administrative outlines for display; they carry no statistical meaning beyond identifying a jurisdiction.
