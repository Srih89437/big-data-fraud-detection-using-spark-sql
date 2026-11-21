"""Report vertex counts and file sizes for candidate boundary GeoJSON files (3D perf planning)."""
import json
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "data" / "boundaries"
for name in ("geoBoundaries-IND-ADM1_simplified.geojson", "geoBoundaries-IND-ADM1.geojson"):
    p = BASE / name
    gj = json.loads(p.read_text(encoding="utf-8"))
    verts = 0
    polys = 0
    rings = 0
    for f in gj["features"]:
        g = f["geometry"]
        coords = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for poly in coords:
            polys += 1
            for ring in poly:
                rings += 1
                verts += len(ring)
    print(f"{name}: {p.stat().st_size/1e6:.1f} MB, {len(gj['features'])} features, "
          f"{polys} polygons, {rings} rings, {verts} vertices")
