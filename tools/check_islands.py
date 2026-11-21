"""Check island/UT polygon-part counts in a boundary GeoJSON (guards against silent island drops)."""
import json
import sys
from pathlib import Path

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    r"frontend\public\geo\india-states.geojson"
)
gj = json.loads(path.read_text(encoding="utf-8"))
KEYS = ("Island", "Lakshadweep", "Nicobar", "Diu", "Daman", "Puducherry", "Chandigarh", "Delhi")
print(f"file: {path}")
for f in gj["features"]:
    name = f["properties"].get("shapeName", "")
    if any(k in name for k in KEYS):
        g = f["geometry"]
        parts = len(g["coordinates"]) if g["type"] == "MultiPolygon" else 1
        print(f"  {name.encode('ascii', 'replace').decode()}: {g['type']}, {parts} part(s)")
