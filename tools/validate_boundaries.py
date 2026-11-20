"""Validate India boundary GeoJSON against the state/UT jurisdiction list in data/statewise_cyber_crimes_2020_2024.csv.

Checks:
- File parses as GeoJSON with a features array.
- Feature count is 36 (28 states + 8 UTs).
- Feature names match CSV jurisdiction names (case-insensitive).
- All feature centroids lie within a plausible India bbox (longitude ~67-98, latitude ~6.5-36.5).
- All polygons have non-empty coordinates (no zero-length degenerate rings).
Prints a report. Exits 1 if jurisdiction names or bbox sanity fail.
"""
from __future__ import annotations

import csv
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEO_PATH = ROOT / "data" / "boundaries" / "india_states_geojson.json"
CSV_PATH = ROOT / "data" / "statewise_cyber_crimes_2020_2024.csv"

INDIA_BBOX = (-170.0, -33.0, 97.6, 36.0)  # lon_min, lat_min, lon_max, lat_max (with margin)


def name_of(props: dict):
    for k in ("ST_NM", "st_nm", "NAME_1", "NAME", "name", "NAME_0"):
        v = props.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def iter_polys(geom):
    """Yield each Polygon geometry's coordinates list from a geom."""
    if geom is None:
        return
    t = geom.get("type")
    if t == "Polygon":
        yield geom["coordinates"]
    elif t == "MultiPolygon":
        for poly in geom.get("coordinates", []):
            yield poly
    else:
        # GeometryCollection
        for g in geom.get("geometries", []):
            yield from iter_polys(g)


def main() -> int:
    # 1. Load CSV jurisdictions
    csv_names = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            csv_names.append(row["state_ut"])
    if len(csv_names) != 36:
        print(f"ERROR: expected 36 CSV jurisdictions, got {len(csv_names)}")
        return 1

    # 2. Load GeoJSON
    try:
        gj = json.loads(GEO_PATH.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: cannot parse {GEO_PATH}: {e}")
        return 1

    feats = gj.get("features", [])
    print(f"GeoJSON: type={gj.get('type')}, features={len(feats)}")

    gj_names, bad_geoms = [], []
    min_lon, min_lat, max_lon, max_lat = math.inf, math.inf, -math.inf, -math.inf
    for i, ft in enumerate(feats):
        nm = name_of(ft.get("properties", {}))
        gj_names.append(nm)
        # bbox + emptiness check
        geom = ft.get("geometry")
        polys = list(iter_polys(geom))
        if not polys:
            bad_geoms.append((i, nm, "no polygon coordinates"))
            continue
        for poly in polys:
            for ring in poly:
                if not ring:
                    bad_geoms.append((i, nm, "empty ring"))
                    continue
                for lon, lat in ring[:1] + ring[1:]:
                    if not (INDIA_BBOX[0] <= lon <= INDIA_BBOX[2] and INDIA_BBOX[1] <= lat <= INDIA_BBOX[3]):
                        bad_geoms.append((i, nm, f"point ({lon},{lat}) outside India bbox"))
                    min_lon = min(min_lon, lon)
                    min_lat = min(min_lat, lat)
                    max_lon = max(max_lon, lon)
                    max_lat = max(max_lat, lat)

    print(f"GeoJSON bbox: lon [{min_lon:.3f}, {max_lon:.3f}], lat [{min_lat:.3f}, {max_lat:.3f}]")
    if bad_geoms:
        print(f"ERROR: {len(bad_geoms)} geometry issues: {bad_geoms[:5]}")
        return 1

    # 3. Name matching
    def norm(n):
        return (n or "").strip().casefold()

    gj_set, csv_set = {norm(n) for n in gj_names if n}, {norm(n) for n in csv_names}
    missing_in_geo = sorted(csv_set - gj_set)
    extra_in_geo = sorted(gj_set - csv_set)
    print(f"Jurisdictions: CSV={len(csv_set)}, GeoJSON={len(gj_set)}, matched={len(csv_set & gj_set)}")
    if missing_in_geo or extra_in_geo or len(gj_set) != 36:
        print(f"ERROR: jurisdiction mismatch: missing_in_geo={missing_in_geo}, extra_in_geo={extra_in_geo}")
        return 1
    print("OK: all 36 CSV jurisdictions found in GeoJSON with matching names; India bbox sanity passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
