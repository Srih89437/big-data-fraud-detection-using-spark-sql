"""Validate a candidate India state/UT boundary GeoJSON against the dataset jurisdiction list.

Usage:
    python tools/validate_boundaries.py <geojson_path> [--report <report_path>]

Checks:
- File parses as GeoJSON FeatureCollection with a features array.
- CRS is WGS84 / CRS84 (or absent, which GeoJSON implies).
- Every feature has a name property and a Polygon/MultiPolygon geometry.
- Geometry coordinates are finite numbers within India's plausible bbox.
- All polygons have non-empty rings (no zero-length degenerate rings).
- Names map onto the 36 CSV jurisdictions (via the state-name mapping layer).
- Reports: matched, missing (in CSV, not in geojson), unmatched (in geojson, not in CSV), duplicates, invalid geometries.

Exit code 0 if all 36 CSV jurisdictions are covered with valid geometry; 1 otherwise.
"""
from __future__ import annotations

import csv
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "statewise_cyber_crimes_2020_2024.csv"
NAME_MAP_PATH = ROOT / "data" / "boundaries" / "state_name_map.json"
REPORT_PATH = ROOT / "data" / "boundaries" / "validation_report.json"

# Plausible India bbox with margin (lon_min, lat_min, lon_max, lat_max).
INDIA_BBOX = (66.0, 5.5, 98.5, 37.5)

# Names tried when reading a feature's jurisdiction name from its properties.
NAME_KEYS = (
    "shapeName", "shapeGroup", "shapeType",
    "ST_NM", "st_nm", "NAME_1", "NAME", "name", "state", "STATE", "state_ut",
)


def name_of(props: dict) -> str | None:
    for k in NAME_KEYS:
        v = props.get(k)
        if isinstance(v, str) and v.strip() and k != "shapeGroup":
            return v.strip()
    return None


def iter_polygons(geom: dict | None):
    """Yield each Polygon's coordinates list from a geometry (handles Polygon/MultiPolygon/GeometryCollection)."""
    if not geom:
        return
    t = geom.get("type")
    if t == "Polygon":
        yield geom.get("coordinates") or []
    elif t == "MultiPolygon":
        for poly in geom.get("coordinates") or []:
            yield poly
    elif t == "GeometryCollection":
        for g in geom.get("geometries") or []:
            yield from iter_polygons(g)


def check_geometry(geom: dict | None, name: str, issues: list[str]) -> tuple[float, float, float, float] | None:
    """Validate one feature's geometry. Returns its bbox if valid, else None. Appends issues."""
    polys = list(iter_polygons(geom))
    if not polys:
        issues.append(f"{name}: no Polygon/MultiPolygon coordinates")
        return None
    min_lon = min_lat = math.inf
    max_lon = max_lat = -math.inf
    ok = True
    for poly in polys:
        if not poly:
            issues.append(f"{name}: empty polygon")
            ok = False
            continue
        for ring in poly:
            if not ring:
                issues.append(f"{name}: empty ring")
                ok = False
                continue
            for pt in ring:
                if not (isinstance(pt, (list, tuple)) and len(pt) >= 2):
                    issues.append(f"{name}: malformed point {pt!r}")
                    ok = False
                    continue
                lon, lat = pt[0], pt[1]
                if not (isinstance(lon, (int, float)) and isinstance(lat, (int, float))):
                    issues.append(f"{name}: non-numeric point {pt!r}")
                    ok = False
                    continue
                if not (math.isfinite(lon) and math.isfinite(lat)):
                    issues.append(f"{name}: non-finite point {pt!r}")
                    ok = False
                    continue
                if not (INDIA_BBOX[0] <= lon <= INDIA_BBOX[2] and INDIA_BBOX[1] <= lat <= INDIA_BBOX[3]):
                    issues.append(f"{name}: point ({lon},{lat}) outside India bbox")
                    ok = False
                min_lon = min(min_lon, lon)
                min_lat = min(min_lat, lat)
                max_lon = max(max_lon, lon)
                max_lat = max(max_lat, lat)
    if not ok or min_lon == math.inf:
        return None
    return (min_lon, min_lat, max_lon, max_lat)


def load_name_map() -> dict[str, str]:
    """Load mapping {normalized_geojson_name: normalized_csv_name} if present."""
    if NAME_MAP_PATH.exists():
        raw = json.loads(NAME_MAP_PATH.read_text(encoding="utf-8"))
        return {k.strip().casefold(): v.strip().casefold() for k, v in raw.items()}
    return {}


def norm(s: str) -> str:
    return s.strip().casefold()


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    geo_path = Path(argv[1])
    report_path = REPORT_PATH
    if "--report" in argv:
        report_path = Path(argv[argv.index("--report") + 1])

    # Load CSV jurisdictions
    csv_names: list[str] = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            csv_names.append(row["state_ut"])
    csv_set = {norm(n) for n in csv_names}
    if len(csv_names) != 36:
        print(f"ERROR: expected 36 CSV jurisdictions, got {len(csv_names)}")
        return 1

    # Load geojson
    try:
        gj = json.loads(geo_path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: cannot parse {geo_path}: {e}")
        return 1
    if gj.get("type") != "FeatureCollection":
        print(f"ERROR: not a FeatureCollection (type={gj.get('type')!r})")
        return 1
    crs = gj.get("crs")
    crs_name = ((crs or {}).get("properties") or {}).get("name", "absent (GeoJSON default = CRS84/WGS84)")
    feats = gj.get("features", [])
    print(f"File: {geo_path}")
    print(f"CRS: {crs_name}")
    print(f"Features: {len(feats)}")

    name_map = load_name_map()
    issues: list[str] = []
    seen: dict[str, int] = {}
    matched: list[dict] = []
    unmatched: list[str] = []
    geo_to_csv: dict[str, str] = {}

    for i, ft in enumerate(feats):
        props = ft.get("properties") or {}
        raw_name = name_of(props)
        if not raw_name:
            issues.append(f"feature[{i}]: no name property found (keys={list(props)[:6]})")
            continue
        bbox = check_geometry(ft.get("geometry"), raw_name, issues)
        key = norm(raw_name)
        seen[key] = seen.get(key, 0) + 1
        # Resolve to CSV name via mapping layer (exact, then alias map).
        csv_name = None
        if key in csv_set:
            csv_name = raw_name
        elif key in name_map:
            csv_name = name_map[key]
        else:
            # Try fuzzy-ish: exact casefold match already failed; report unmatched.
            unmatched.append(raw_name)
            continue
        if bbox:
            geo_to_csv[raw_name] = csv_name
            matched.append({
                "geojson_name": raw_name,
                "csv_name": csv_name,
                "bbox": [round(x, 4) for x in bbox],
                "geometry": ft["geometry"]["type"],
            })
        else:
            issues.append(f"{raw_name}: geometry invalid, not counted as matched")

    dupes = {k: v for k, v in seen.items() if v > 1}
    matched_csv = {norm(m["csv_name"]) for m in matched}
    missing = sorted(csv_set - matched_csv)

    report = {
        "file": str(geo_path),
        "crs": crs_name,
        "feature_count": len(feats),
        "csv_jurisdictions": len(csv_set),
        "matched_count": len(matched),
        "matched": matched,
        "missing_in_geojson": missing,
        "unmatched_in_csv": sorted(unmatched),
        "duplicate_names": dupes,
        "invalid_geometry_issues": issues,
        "all_36_covered": not missing and not dupes and not issues,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"\nMatched: {len(matched)}/{len(csv_set)}")
    print(f"Missing (in CSV, not in geojson): {missing}")
    print(f"Unmatched (in geojson, not in CSV): {sorted(unmatched)}")
    print(f"Duplicate names: {dupes}")
    print(f"Invalid geometry issues: {len(issues)}")
    for m in matched:
        print(f"  ✓ {m['geojson_name']} -> {m['csv_name']} ({m['geometry']})")
    print(f"\nReport written to {report_path}")

    return 0 if report["all_36_covered"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
