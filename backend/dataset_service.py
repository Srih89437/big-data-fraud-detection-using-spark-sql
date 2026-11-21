"""
Dataset Studio Backend Engine:
Manages uploaded datasets, profiling, schema inference, recommendations,
data previews, dynamic aggregations, and 3D visualization coordinate data.
Completely isolated from the baseline statewise tables.
"""

import csv
import json
import math
import os
import re
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
CUSTOM_DIR = ROOT / "data" / "custom_datasets"
CUSTOM_DIR.mkdir(parents=True, exist_ok=True)

# 36 standard Indian jurisdiction names for automatic geographic detection
INDIAN_STATES = {
    "andaman and nicobar islands", "andhra pradesh", "arunachal pradesh", "assam",
    "bihar", "chandigarh", "chhattisgarh", "dadra and nagar haveli and daman and diu",
    "delhi", "goa", "gujarat", "haryana", "himachal pradesh", "jammu and kashmir",
    "jharkhand", "karnataka", "kerala", "ladakh", "lakshadweep", "madhya pradesh",
    "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland", "odisha",
    "puducherry", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana",
    "tripura", "uttar pradesh", "uttarakhand", "west bengal"
}


def _clean_str(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip()


def parse_file_to_records(file_path: Path) -> List[Dict[str, Any]]:
    """Parse CSV, TSV, JSON, or JSONL into a list of row dicts."""
    ext = file_path.suffix.lower()

    if ext in [".csv", ".tsv", ".tab"]:
        delimiter = "\t" if ext in [".tsv", ".tab"] else ","
        rows: List[Dict[str, Any]] = []
        with open(file_path, mode="r", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.DictReader(f, delimiter=delimiter)
            for r in reader:
                clean_row = {}
                for k, v in r.items():
                    if k is not None:
                        clean_row[k.strip()] = v.strip() if isinstance(v, str) else v
                rows.append(clean_row)
        return rows

    elif ext == ".json":
        with open(file_path, mode="r", encoding="utf-8-sig", errors="replace") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                # Check if it has a records/data key
                for k in ["data", "records", "rows", "items"]:
                    if k in data and isinstance(data[k], list):
                        return data[k]
                return [data]
            return []

    elif ext in [".jsonl", ".ndjson"]:
        rows = []
        with open(file_path, mode="r", encoding="utf-8-sig", errors="replace") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        rows.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        return rows

    else:
        # Default fallback to CSV reader
        rows = []
        with open(file_path, mode="r", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.DictReader(f)
            for r in reader:
                rows.append({k.strip(): v for k, v in r.items() if k is not None})
        return rows


def infer_column_type(values: List[Any]) -> Tuple[str, Optional[str]]:
    """
    Infers whether column is:
    - numeric (integer, float)
    - datetime (date/timestamp)
    - geographic (india_state, lat_long, country)
    - categorical (string, low cardinality)
    """
    non_null = [v for v in values if v is not None and str(v).strip() != "" and str(v).strip().lower() != "null"]
    if not non_null:
        return "categorical", None

    sample = non_null[:150]

    # Check numeric
    numeric_count = 0
    for v in sample:
        try:
            float(str(v).replace(",", ""))
            numeric_count += 1
        except (ValueError, TypeError):
            pass

    if numeric_count / len(sample) >= 0.85:
        # Check if float or integer
        is_float = any("." in str(v) for v in sample)
        return "numeric", "float" if is_float else "integer"

    # Check Indian State match
    str_sample = [str(v).lower().strip() for v in sample]
    state_matches = sum(1 for s in str_sample if s in INDIAN_STATES)
    if state_matches / len(sample) >= 0.4:
        return "geographic", "india_state"

    # Check datetime
    date_count = 0
    date_patterns = [
        r"^\d{4}-\d{2}-\d{2}",
        r"^\d{2}/\d{2}/\d{4}",
        r"^\d{4}/\d{2}/\d{2}",
        r"^\d{2}-\d{2}-\d{4}",
        r"^\w{3,9}\s+\d{1,2},\s+\d{4}"
    ]
    for v in sample:
        s = str(v).strip()
        if any(re.search(p, s) for p in date_patterns):
            date_count += 1
    if date_count / len(sample) >= 0.7:
        return "datetime", "timestamp"

    # Otherwise categorical
    return "categorical", "text"


def profile_dataset(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generates schema profile, column statistics, cardinality, and recommendations."""
    if not rows:
        return {
            "row_count": 0,
            "column_count": 0,
            "columns": [],
            "recommendations": []
        }

    total_rows = len(rows)
    all_keys = list(rows[0].keys()) if rows else []

    columns_meta = []
    numeric_cols = []
    categorical_cols = []
    datetime_cols = []
    geo_cols = []

    for col in all_keys:
        vals = [r.get(col) for r in rows]
        col_type, subtype = infer_column_type(vals)

        # Basic stats
        non_null_vals = [v for v in vals if v is not None and str(v).strip() != "" and str(v).strip().lower() != "null"]
        null_count = total_rows - len(non_null_vals)
        unique_vals = list(set(non_null_vals))
        cardinality = len(unique_vals)

        cardinality_ratio = round(cardinality / max(total_rows, 1), 4)
        # Translate geographic subtype to match frontend ColumnProfile semantic_type enum
        semantic_type_map = {
            "india_state": "india_state_ut",
            "timestamp": "timestamp",
            "float": "general",
            "integer": "general",
            "text": "general",
        }
        effective_semantic = semantic_type_map.get(subtype or "", "general")

        stats: Dict[str, Any] = {
            "name": col,
            "type": col_type,
            "inferred_type": col_type if col_type != "geographic" else "categorical",
            "subtype": subtype,
            "semantic_type": effective_semantic if col_type == "geographic" else (subtype or "general"),
            "null_count": null_count,
            "null_pct": round((null_count / total_rows) * 100, 1),
            "null_percentage": round((null_count / total_rows) * 100, 1),
            "cardinality": cardinality,
            "unique_count": cardinality,
            "cardinality_ratio": cardinality_ratio,
            "total_count": total_rows,
            "sample_values": [str(v) for v in non_null_vals[:6]]
        }

        if col_type == "numeric":
            parsed_nums = []
            for v in non_null_vals:
                try:
                    parsed_nums.append(float(str(v).replace(",", "")))
                except (ValueError, TypeError):
                    pass
            if parsed_nums:
                parsed_nums.sort()
                stats["min"] = round(parsed_nums[0], 2)
                stats["max"] = round(parsed_nums[-1], 2)
                stats["mean"] = round(sum(parsed_nums) / len(parsed_nums), 2)
                mid = len(parsed_nums) // 2
                stats["median"] = round((parsed_nums[mid] + parsed_nums[~mid]) / 2, 2)
            numeric_cols.append(col)

        elif col_type == "categorical":
            categorical_cols.append(col)
        elif col_type == "datetime":
            datetime_cols.append(col)
        elif col_type == "geographic":
            # Geographic columns behave as categorical for grouping purposes
            # but keep the geo_cols list for recommendation generation
            categorical_cols.append(col)
            geo_cols.append(col)

        columns_meta.append(stats)

    return {
        "row_count": total_rows,
        "column_count": len(all_keys),
        "columns": columns_meta,
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "datetime_columns": datetime_cols,
        "geographic_columns": geo_cols,
        "recommendations": []
    }


def query_dataset(
    rows: List[Dict[str, Any]],
    x_col: Optional[str] = None,
    y_col: Optional[str] = None,
    z_col: Optional[str] = None,
    color_col: Optional[str] = None,
    size_col: Optional[str] = None,
    agg_func: str = "sum",
    limit: int = 400,
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Executes aggregation and coordinate mapping for 3D visualizations.
    Returns structured data points with x, y, z coordinates, color values, labels, and raw data.
    """
    filtered = rows
    if filters:
        for k, v in filters.items():
            if v:
                filtered = [r for r in filtered if str(r.get(k, "")).lower() == str(v).lower()]

    if not filtered:
        return {"points": [], "meta": {"count": 0}}

    points = []

    # If x_col and y_col are specified and we need aggregation
    if x_col and y_col:
        # Group by x_col and optional z_col
        grouped: Dict[Tuple[str, str], List[float]] = {}
        grouped_raw: Dict[Tuple[str, str], Dict[str, Any]] = {}

        for r in filtered:
            x_val = _clean_str(r.get(x_col, "Unknown"))
            z_val = _clean_str(r.get(z_col, "Default")) if z_col else "All"
            key = (x_val, z_val)

            # Extract numeric y
            raw_y = r.get(y_col)
            try:
                num_y = float(str(raw_y).replace(",", ""))
            except (ValueError, TypeError):
                num_y = 1.0 if agg_func == "count" else 0.0

            if key not in grouped:
                grouped[key] = []
                grouped_raw[key] = r
            grouped[key].append(num_y)

        # Compute aggregate
        for (x_val, z_val), val_list in list(grouped.items())[:limit]:
            if agg_func == "sum":
                agg_y = sum(val_list)
            elif agg_func == "avg" or agg_func == "mean":
                agg_y = sum(val_list) / len(val_list)
            elif agg_func == "max":
                agg_y = max(val_list)
            elif agg_func == "min":
                agg_y = min(val_list)
            elif agg_func == "count":
                agg_y = len(val_list)
            else:
                agg_y = sum(val_list)

            raw_row = grouped_raw[(x_val, z_val)]

            # Extract color and size
            color_val = raw_row.get(color_col) if color_col else agg_y
            size_val = raw_row.get(size_col) if size_col else 1.0
            try:
                size_num = float(str(size_val).replace(",", ""))
            except (ValueError, TypeError):
                size_num = 1.0

            points.append({
                "x_label": x_val,
                "z_label": z_val,
                "y_val": round(agg_y, 2),
                "color_val": color_val,
                "size_val": round(size_num, 2),
                "count": len(val_list)
            })

    else:
        # Pass-through points (for scatter, raw plot)
        for r in filtered[:limit]:
            points.append(r)

    y_vals = [p["y_val"] for p in points if isinstance(p, dict) and "y_val" in p]
    min_val = min(y_vals) if y_vals else 0.0
    max_val = max(y_vals) if y_vals else 1.0

    # Normalize coordinates for 3D visualization scene space
    return {
        "points": points,
        "meta": {
            "total_sampled": len(points),
            "agg_func": agg_func,
            "x_col": x_col,
            "y_col": y_col,
            "z_col": z_col,
            "color_col": color_col,
            "size_col": size_col,
            "min_val": min_val,
            "max_val": max_val
        }
    }


def seed_demo_datasets():
    """Generates 3 rich, realistic enterprise datasets for immediate analytical testing."""
    # 1. Global Cyber Threat Telemetry
    p1 = CUSTOM_DIR / "global_cyber_threat_telemetry.csv"
    if not p1.exists():
        threats = ["Ransomware", "Credential Phishing", "Distributed Denial of Service", "Supply Chain Malware", "API Injection", "Insider Data Exfiltration"]
        countries = ["India", "United States", "United Kingdom", "Germany", "Singapore", "Australia", "Japan", "Brazil", "France", "Canada"]
        industries = ["Financial Services", "Critical Infrastructure", "Healthcare", "Government Defense", "Telecommunications", "E-Commerce"]

        rows = []
        import random
        random.seed(42)
        years = [2022, 2023, 2024]
        for y in years:
            for m in range(1, 13):
                date_str = f"{y}-{m:02d}-15"
                for country in countries:
                    for threat in threats[:4]:
                        rows.append({
                            "Date": date_str,
                            "Country": country,
                            "Threat_Type": threat,
                            "Industry_Sector": random.choice(industries),
                            "Incident_Severity_Score": round(random.uniform(4.2, 9.8), 1),
                            "Attacks_Detected": random.randint(140, 8900),
                            "Mean_Time_To_Detect_Min": random.randint(12, 240),
                            "Financial_Loss_USD_K": random.randint(50, 4200),
                            "Containment_Status": random.choice(["Mitigated", "Investigating", "Contained", "Escalated"])
                        })
        with open(p1, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

    # 2. India State Cyber Infrastructure & Readiness Index (Compatible with 3D India Map!)
    p2 = CUSTOM_DIR / "india_state_cyber_infrastructure.csv"
    if not p2.exists():
        states_list = sorted(list(INDIAN_STATES))
        infra_rows = []
        import random
        random.seed(101)
        for s in states_list:
            display_name = s.title()
            infra_rows.append({
                "state_ut": display_name,
                "Cyber_Police_Stations": random.randint(2, 68),
                "Cyber_Digital_Labs": random.randint(1, 14),
                "Digital_Literacy_Index": round(random.uniform(42.0, 94.5), 1),
                "Broadband_Penetration_Pct": round(random.uniform(38.0, 96.0), 1),
                "Annual_Cyber_Budget_Cr": round(random.uniform(4.5, 125.0), 2),
                "Specialist_Investigators": random.randint(15, 340),
                "Citizen_Awareness_Campaigns": random.randint(10, 180)
            })
        with open(p2, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(infra_rows[0].keys()))
            writer.writeheader()
            writer.writerows(infra_rows)

    # 3. Financial Transaction Fraud Surveillance (Scatter/Bubble friendly)
    p3 = CUSTOM_DIR / "financial_fraud_surveillance.csv"
    if not p3.exists():
        channels = ["Unified Payments Interface (UPI)", "Internet Banking", "Credit Cards", "ATM Cloning", "Cryptocurrency Rail", "Point of Sale"]
        fraud_rows = []
        import random
        random.seed(202)
        for ch in channels:
            for vol_bracket in ["Low Volume Hub", "Medium Tier", "High Velocity Hub", "Enterprise Gateway"]:
                for month in range(1, 13):
                    fraud_rows.append({
                        "Payment_Channel": ch,
                        "Gateway_Tier": vol_bracket,
                        "Month": f"2024-{month:02d}",
                        "Transaction_Volume_Millions": round(random.uniform(1.2, 45.0), 2),
                        "Flagged_Fraud_Attempts": random.randint(40, 1420),
                        "Total_Defrauded_Amount_Lakhs": round(random.uniform(8.0, 890.0), 2),
                        "Automated_Recovery_Rate_Pct": round(random.uniform(18.5, 92.4), 1),
                        "Risk_Score": round(random.uniform(1.5, 9.5), 1)
                    })
        with open(p3, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(fraud_rows[0].keys()))
            writer.writeheader()
            writer.writerows(fraud_rows)


# Seed preloaded analytical datasets on import
seed_demo_datasets()
