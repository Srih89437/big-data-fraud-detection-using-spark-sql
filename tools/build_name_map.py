"""Build the state/UT name-mapping layer between boundary GeoJSON names and dataset CSV names.

Normalizes diacritics/transliterations (e.g. 'Mahārāshtra' -> 'Maharashtra') using Unicode
NFD decomposition + combining-mark stripping, then applies an explicit alias table for
remaining differences. Writes data/boundaries/state_name_map.json:

    { "<geojson name as-is>": "<csv jurisdiction name>", ... }

Prints a coverage report. Exit 0 if all 36 CSV jurisdictions are covered.
"""
from __future__ import annotations

import csv
import json
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "statewise_cyber_crimes_2020_2024.csv"
GEO_PATH = ROOT / "data" / "boundaries" / "geoBoundaries-IND-ADM1_simplified.geojson"
OUT_PATH = ROOT / "data" / "boundaries" / "state_name_map.json"

# Explicit aliases for names that still differ after diacritic normalization.
ALIASES: dict[str, str] = {
    "andaman and nicobar": "andaman and nicobar islands",
    "andaman & nicobar islands": "andaman and nicobar islands",
    "dadra and nagar haveli": "dadra and nagar haveli and daman and diu",
    "daman and diu": "dadra and nagar haveli and daman and diu",
    "nct of delhi": "delhi",
    "delhi": "delhi",
    "jammu & kashmir": "jammu and kashmir",
    "orissa": "odisha",
    "uttaranchal": "uttarakhand",
    "pondicherry": "puducherry",
    "lakshadweep": "lakshadweep",
}


def strip_diacritics(s: str) -> str:
    """NFD-decompose and drop combining marks: 'Mahārāshtra' -> 'Maharashtra'."""
    nfd = unicodedata.normalize("NFD", s)
    return "".join(ch for ch in nfd if not unicodedata.combining(ch))


def norm(s: str) -> str:
    return " ".join(strip_diacritics(s).strip().casefold().split())


def main() -> int:
    csv_names: list[str] = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            csv_names.append(row["state_ut"])
    if len(csv_names) != 36:
        print(f"ERROR: expected 36 CSV jurisdictions, got {len(csv_names)}")
        return 1
    csv_by_norm = {norm(n): n for n in csv_names}
    if len(csv_by_norm) != 36:
        print(f"ERROR: CSV names collide after normalization: {csv_by_norm}")
        return 1

    gj = json.loads(GEO_PATH.read_text(encoding="utf-8"))
    feats = gj.get("features", [])
    mapping: dict[str, str] = {}
    matched_norms: set[str] = set()
    problems: list[str] = []

    for i, ft in enumerate(feats):
        name = (ft.get("properties") or {}).get("shapeName")
        if not isinstance(name, str) or not name.strip():
            problems.append(f"feature[{i}]: missing shapeName")
            continue
        key = norm(name)
        csv_name = csv_by_norm.get(key) or csv_by_norm.get(ALIASES.get(key, ""))
        if csv_name is None:
            problems.append(f"feature[{i}]: '{name}' (norm='{key}') has no CSV match")
            continue
        if norm(csv_name) in matched_norms:
            problems.append(f"feature[{i}]: '{name}' duplicates CSV jurisdiction '{csv_name}'")
            continue
        mapping[name] = csv_name
        matched_norms.add(norm(csv_name))

    missing = sorted(set(csv_by_norm.values()) - set(mapping.values()))
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"GeoJSON features: {len(feats)}")
    print(f"Mapped: {len(mapping)}/{len(csv_names)}")
    print(f"Missing CSV jurisdictions: {missing}")
    print(f"Problems: {problems}")
    print(f"Mapping written to {OUT_PATH}")
    for geo_name, csv_name in sorted(mapping.items(), key=lambda kv: kv[1]):
        flag = "" if geo_name == csv_name else f"   (differs: '{geo_name}')"
        print(f"  {csv_name}{flag}")
    return 0 if not missing and not problems else 1


if __name__ == "__main__":
    sys.exit(main())
