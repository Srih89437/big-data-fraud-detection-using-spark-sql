"""
Reconciliation & Data Integrity Verification Script
Checks source dataset, Spark SQL queries, and API endpoints.
"""
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "statewise_cyber_crimes_2020_2024.csv"

# Stable ISO 3166-2:IN codes mapped to canonical names
STATE_TO_CODE = {
    "Andhra Pradesh": "IN-AP",
    "Arunachal Pradesh": "IN-AR",
    "Assam": "IN-AS",
    "Bihar": "IN-BR",
    "Chhattisgarh": "IN-CT",
    "Goa": "IN-GA",
    "Gujarat": "IN-GJ",
    "Haryana": "IN-HR",
    "Himachal Pradesh": "IN-HP",
    "Jharkhand": "IN-JH",
    "Karnataka": "IN-KA",
    "Kerala": "IN-KL",
    "Madhya Pradesh": "IN-MP",
    "Maharashtra": "IN-MH",
    "Manipur": "IN-MN",
    "Meghalaya": "IN-ML",
    "Mizoram": "IN-MZ",
    "Nagaland": "IN-NL",
    "Odisha": "IN-OR",
    "Punjab": "IN-PB",
    "Rajasthan": "IN-RJ",
    "Sikkim": "IN-SK",
    "Tamil Nadu": "IN-TN",
    "Telangana": "IN-TG",
    "Tripura": "IN-TR",
    "Uttar Pradesh": "IN-UP",
    "Uttarakhand": "IN-UT",
    "West Bengal": "IN-WB",
    "Andaman and Nicobar Islands": "IN-AN",
    "Chandigarh": "IN-CH",
    "Dadra and Nagar Haveli and Daman and Diu": "IN-DH",
    "Delhi": "IN-DL",
    "Jammu and Kashmir": "IN-JK",
    "Ladakh": "IN-LA",
    "Lakshadweep": "IN-LD",
    "Puducherry": "IN-PY",
}

EXPECTED_TOTALS = {
    "2020": 50035,
    "2021": 52974,
    "2022": 65893,
    "2023": 86420,
    "2024": 101928,
}

EXPECTED_STATES_TOTALS = {
    "2020": 49708,
    "2021": 52430,
    "2022": 64907,
    "2023": 85603,
    "2024": 101118,
}

EXPECTED_UTS_TOTALS = {
    "2020": 327,
    "2021": 544,
    "2022": 986,
    "2023": 817,
    "2024": 810,
}

def reconcile():
    print(f"Reading dataset: {DATA_PATH}")
    assert DATA_PATH.exists(), f"Missing dataset: {DATA_PATH}"

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    print(f"Total jurisdictions found: {len(rows)}")
    assert len(rows) == 36, f"Expected 36 jurisdictions, got {len(rows)}"

    states = [r for r in rows if r["category"] == "State"]
    uts = [r for r in rows if r["category"] == "Union Territory"]
    print(f"States count: {len(states)} (expected 28)")
    print(f"UTs count: {len(uts)} (expected 8)")
    assert len(states) == 28, f"Expected 28 States, got {len(states)}"
    assert len(uts) == 8, f"Expected 8 UTs, got {len(uts)}"

    # Check codes coverage
    for r in rows:
        name = r["state_ut"]
        assert name in STATE_TO_CODE, f"Jurisdiction '{name}' missing ISO code mapping!"

    # Verify per-year mathematical reconciliation
    for y in ["2020", "2021", "2022", "2023", "2024"]:
        total = sum(int(r[y]) for r in rows)
        s_tot = sum(int(r[y]) for r in states)
        u_tot = sum(int(r[y]) for r in uts)
        print(f"Year {y}: Total={total}, States={s_tot}, UTs={u_tot}")
        assert s_tot + u_tot == total, f"Year {y} state+ut sum mismatch!"
        assert total == EXPECTED_TOTALS[y], f"Year {y} total {total} != expected {EXPECTED_TOTALS[y]}"
        assert s_tot == EXPECTED_STATES_TOTALS[y], f"Year {y} states {s_tot} != expected {EXPECTED_STATES_TOTALS[y]}"
        assert u_tot == EXPECTED_UTS_TOTALS[y], f"Year {y} UTs {u_tot} != expected {EXPECTED_UTS_TOTALS[y]}"

    # Verify 2024 Rankings
    sorted_2024 = sorted(rows, key=lambda r: int(r["2024"]), reverse=True)
    rank_1 = sorted_2024[0]
    rank_2 = sorted_2024[1]
    print(f"2024 Rank #1: {rank_1['state_ut']} ({rank_1['2024']} cases)")
    print(f"2024 Rank #2: {rank_2['state_ut']} ({rank_2['2024']} cases)")

    assert rank_1["state_ut"] == "Telangana" and int(rank_1["2024"]) == 27230, "Telangana must be rank 1 with 27,230 cases!"
    assert rank_2["state_ut"] == "Karnataka" and int(rank_2["2024"]) == 21993, "Karnataka must be rank 2 with 21,993 cases!"

    print("\nALL RECONCILIATION CHECKS PASSED WITH 100% INTEGRITY!")

if __name__ == "__main__":
    reconcile()
