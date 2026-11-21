import json
import math
import re
import threading
import uuid
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, List
from pathlib import Path
from functools import lru_cache
from time import monotonic
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

try:
    from backend.dataset_service import (
        CUSTOM_DIR,
        parse_file_to_records,
        profile_dataset,
        query_dataset,
        seed_demo_datasets,
    )
except ImportError:
    from dataset_service import (
        CUSTOM_DIR,
        parse_file_to_records,
        profile_dataset,
        query_dataset,
        seed_demo_datasets,
    )

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "statewise_cyber_crimes_2020_2024.csv"
# The validated, bundled boundary file (also served statically by Vite at
# /geo/india-states.geojson). Keeping one canonical copy avoids drift.
GEO_PATH = ROOT / "frontend" / "public" / "geo" / "india-states.geojson"
SOURCE_LINE = "NCRB, Crime in India; Ministry of Home Affairs / PIB (Press Release PRID 2287039, 21 July 2026)"


@asynccontextmanager
async def lifespan(app: FastAPI):
    def _warmup():
        try:
            seed_demo_datasets()
            df = loaded_df()
            df.count()
        except Exception as e:
            print(f"Warmup notice: {e}")

    t = threading.Thread(target=_warmup, daemon=True)
    t.start()
    yield


app = FastAPI(title="India Cyber Crime Intelligence API", version="1.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- In-memory TTL cache (per key) ------------------------------------------
_TTL_SECONDS = 60.0
_cache: dict[str, tuple[float, object]] = {}


def _cached(key: str, compute):
    hit = _cache.get(key)
    if hit and monotonic() - hit[0] < _TTL_SECONDS:
        return hit[1]
    value = compute()
    _cache[key] = (monotonic(), value)
    return value


def _invalidate(prefix: str = ""):
    for k in list(_cache):
        if k.startswith(prefix):
            _cache.pop(k, None)


# ---- Spark -------------------------------------------------------------------
@lru_cache(maxsize=1)
def spark():
    return (
        SparkSession.builder.appName("IndiaCyberCrimeDashboard")
        .master("local[*]")
        .config("spark.sql.shuffle.partitions", "4")
        .config("spark.driver.memory", "2g")
        .getOrCreate()
    )


@lru_cache(maxsize=1)
def loaded_df():
    try:
        df = (
            spark().read.option("header", True).option("inferSchema", True)
            .option("mode", "FAILFAST").csv(str(DATA))
        )
        df.cache()
        df.createOrReplaceTempView("state_cyber_crimes")
        return df
    except Exception as e:  # noqa: BLE001
        raise HTTPException(503, f"Dataset load failed: {e}")


def query_rows(sql):
    return [r.asDict(recursive=True) for r in spark().sql(sql).collect()]


def year_cols():
    return loaded_df().columns


def _validate_year(year: int):
    if year not in range(2020, 2025):
        raise HTTPException(400, "Year must be between 2020 and 2024")


# ---- Global error handling -----------------------------------------------------
@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):  # noqa: ANN001
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.exception_handler(404)
async def not_found(request: Request, exc: Exception):  # noqa: ANN001
    return JSONResponse(status_code=404, content={"detail": "Not found"})


# ---- Routes --------------------------------------------------------------------
@app.get("/")
def index():
    return {
        "service": "India Cyber Crime Intelligence Platform (ICIP) Backend",
        "engine": "Apache Spark SQL",
        "status": "online",
        "endpoints": {
            "docs": "/docs",
            "health": "/api/health",
            "years": "/api/years",
            "overview": "/api/overview?year=2024",
            "states": "/api/states?year=2024",
            "trends": "/api/trends",
            "custom_datasets": "/api/custom-datasets"
        }
    }


# Standard ISO 3166-2:IN jurisdiction codes for all 36 Indian states and UTs
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

@app.get("/api/health")
def health():
    try:
        cnt = loaded_df().count()
        return {
            "status": "healthy",
            "spark_connected": True,
            "engine": "Apache Spark SQL 3.5",
            "dataset": DATA.name,
            "jurisdiction_count": cnt,
            "years": [2020, 2021, 2022, 2023, 2024],
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "spark_connected": False, "error": str(e)}
        )


@app.get("/api/bootstrap")
def bootstrap():
    """Consolidated bootstrap payload for high-performance initial page render."""
    def compute():
        cols = [c for c in year_cols() if c.isdigit()]
        sums = ", ".join(f"SUM(`{c}`) AS `{c}`" for c in sorted(cols))
        totals_row = query_rows(f"SELECT {sums} FROM state_cyber_crimes")[0]
        national_totals = [{"year": int(c), "cases": int(totals_row[c] or 0)} for c in sorted(cols)]

        c2024 = int(totals_row.get("2024") or 0)
        c2023 = int(totals_row.get("2023") or 0)
        yoy = round(((c2024 - c2023) / c2023) * 100, 1) if c2023 > 0 else 0.0

        top_rows = query_rows("""
            SELECT state_ut, category,
                   CAST(`2020` AS BIGINT) AS c2020,
                   CAST(`2023` AS BIGINT) AS c2023,
                   CAST(`2024` AS BIGINT) AS c2024
            FROM state_cyber_crimes
            ORDER BY c2024 DESC
            LIMIT 5
        """)
        top_5 = []
        for idx, r in enumerate(top_rows):
            cnt = int(r["c2024"])
            p_cnt = int(r["c2023"])
            ryoy = round(((cnt - p_cnt) / p_cnt) * 100, 1) if p_cnt > 0 else 0.0
            share = round((cnt / c2024) * 100, 1) if c2024 > 0 else 0.0
            top_5.append({
                "rank": idx + 1,
                "state_ut": r["state_ut"],
                "code": STATE_TO_CODE.get(r["state_ut"], ""),
                "category": r["category"],
                "cases": cnt,
                "share": share,
                "yoy_change": ryoy,
            })

        top_5_cases = sum(t["cases"] for t in top_5)
        top_5_share = round((top_5_cases / c2024) * 100, 1) if c2024 > 0 else 0.0

        all_states_rows = query_rows("""
            SELECT state_ut,
                   CAST(`2023` AS BIGINT) AS c2023,
                   CAST(`2024` AS BIGINT) AS c2024
            FROM state_cyber_crimes
            WHERE `2023` > 100
        """)
        fastest = max(all_states_rows, key=lambda r: (r["c2024"] - r["c2023"]) / r["c2023"] if r["c2023"] > 0 else 0)
        fastest_yoy = round(((fastest["c2024"] - fastest["c2023"]) / fastest["c2023"]) * 100, 1)
        fastest_growth = {
            "state_ut": fastest["state_ut"],
            "code": STATE_TO_CODE.get(fastest["state_ut"], ""),
            "cases": int(fastest["c2024"]),
            "yoy_change": fastest_yoy,
        }

        return {
            "status": "healthy",
            "version": "1.2.0",
            "as_of": "21 July 2026",
            "source": SOURCE_LINE,
            "engine": "Apache Spark SQL 3.5",
            "years": sorted(int(c) for c in cols),
            "latest_year": 2024,
            "latest_total": c2024,
            "previous_total": c2023,
            "yoy_change_pct": yoy,
            "jurisdiction_count": 36,
            "national_totals": national_totals,
            "top_5": top_5,
            "top_5_cases": top_5_cases,
            "top_5_share": top_5_share,
            "fastest_growth": fastest_growth,
        }

    data = _cached("bootstrap", compute)
    return JSONResponse(
        content=data,
        headers={
            "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
            "ETag": '"icip-bootstrap-2024-v120"',
        }
    )


@app.get("/api/years")
def years():
    cols = year_cols()
    return {"years": sorted(int(c) for c in cols if c.isdigit())}


@app.get("/api/states")
def states(year: int = 2024):
    _validate_year(year)

    def compute():
        rows = query_rows(f"""
            SELECT state_ut, category, CAST(`{year}` AS BIGINT) AS cases
            FROM state_cyber_crimes ORDER BY cases DESC
        """)
        for r in rows:
            r["code"] = STATE_TO_CODE.get(r["state_ut"], "")
        return {"year": year, "states": rows, "source": SOURCE_LINE}

    return _cached(f"states:{year}", compute)


@app.get("/api/overview")
def overview(year: int = 2024):
    _validate_year(year)

    def compute():
        summary = query_rows(f"""
            SELECT SUM(CASE WHEN category='State' THEN `{year}` ELSE 0 END) AS state_cases,
                   SUM(CASE WHEN category='Union Territory' THEN `{year}` ELSE 0 END) AS ut_cases,
                   SUM(`{year}`) AS total_cases, COUNT(*) AS jurisdictions
            FROM state_cyber_crimes
        """)[0]
        top = query_rows(f"""
            SELECT state_ut, category, CAST(`{year}` AS BIGINT) AS cases
            FROM state_cyber_crimes ORDER BY cases DESC LIMIT 1
        """)
        top_state = None
        if top and summary.get("total_cases"):
            t_row = top[0]
            tot = summary["total_cases"]
            top_state = {
                "state_ut": t_row["state_ut"],
                "code": STATE_TO_CODE.get(t_row["state_ut"], ""),
                "category": t_row["category"],
                "cases": t_row["cases"],
                "share": round((t_row["cases"] / tot) * 100, 1) if tot > 0 else 0.0,
            }
        return {"year": year, **summary, "top_state": top_state, "source": SOURCE_LINE}

    return _cached(f"overview:{year}", compute)


@app.get("/api/matrix")
def multi_year_matrix(year: int = 2024):
    """Multi-year complete jurisdiction matrix (2020-2024) with derived YoY, CAGR, share, and sparkline."""
    _validate_year(year)

    def compute():
        loaded_df()
        rows = query_rows("""
            SELECT state_ut, category,
                   CAST(`2020` AS BIGINT) AS `2020`,
                   CAST(`2021` AS BIGINT) AS `2021`,
                   CAST(`2022` AS BIGINT) AS `2022`,
                   CAST(`2023` AS BIGINT) AS `2023`,
                   CAST(`2024` AS BIGINT) AS `2024`
            FROM state_cyber_crimes
        """)
        # Sort by the active year descending to assign ranks
        rows.sort(key=lambda r: r.get(str(year), 0), reverse=True)
        national_total_active = sum(r.get(str(year), 0) for r in rows)

        matrix = []
        for idx, r in enumerate(rows):
            c20 = r.get("2020", 0)
            c21 = r.get("2021", 0)
            c22 = r.get("2022", 0)
            c23 = r.get("2023", 0)
            c24 = r.get("2024", 0)
            c_active = r.get(str(year), 0)
            total_5yr = c20 + c21 + c22 + c23 + c24

            # YoY change for active year
            prev_y = str(year - 1)
            prev_cases = r.get(prev_y)
            yoy = None
            if prev_cases and prev_cases > 0:
                yoy = round(((c_active - prev_cases) / prev_cases) * 100, 1)

            # 5-year CAGR (2020 to 2024)
            cagr = None
            if c20 > 0 and c24 > 0:
                cagr = round(((c24 / c20) ** (1 / 4) - 1) * 100, 1)

            share = round((c_active / national_total_active) * 100, 2) if national_total_active > 0 else 0.0

            matrix.append({
                "code": STATE_TO_CODE.get(r["state_ut"], ""),
                "state_ut": r["state_ut"],
                "category": r["category"],
                "cases": c_active,
                "rank": idx + 1,
                "share": share,
                "yoy_change": yoy,
                "cagr_5yr": cagr,
                "total_cases_5yr": total_5yr,
                "sparkline": [c20, c21, c22, c23, c24],
                "history": {
                    2020: c20,
                    2021: c21,
                    2022: c22,
                    2023: c23,
                    2024: c24,
                }
            })

        return {
            "year": year,
            "total_cases": national_total_active,
            "jurisdiction_count": len(matrix),
            "matrix": matrix,
            "source": SOURCE_LINE
        }

    return _cached(f"matrix:{year}", compute)


@app.get("/api/trends")
def trends():
    """National registered-cases totals for every available year."""

    def compute():
        cols = [c for c in year_cols() if c.isdigit()]
        sums = ", ".join(f"SUM(`{c}`) AS `{c}`" for c in cols)
        row = query_rows(f"SELECT {sums} FROM state_cyber_crimes")[0]
        return {
            "national_total": [{"year": int(c), "cases": row[c] or 0} for c in sorted(cols)],
            "source": SOURCE_LINE,
        }

    return _cached("trends", compute)


@app.get("/api/state/{state_name}")
def state_detail(state_name: str):
    safe = state_name.strip().lower()
    cols = [c for c in year_cols() if c.isdigit()]
    df = loaded_df().filter(F.lower(F.col("state_ut")) == safe).select(
        "state_ut", "category", *[F.col(c).cast("long").alias(c) for c in cols]
    ).collect()
    if not df:
        raise HTTPException(404, "State or Union Territory not found")
    res = df[0].asDict()
    res["code"] = STATE_TO_CODE.get(res["state_ut"], "")
    return res


@app.get("/api/state_trends/{state_name}")
def state_trends(state_name: str):
    return state_detail(state_name)


@app.get("/api/geo/india_states")
def geo_india_states():
    """Serve the bundled boundary GeoJSON so the map has no network dependency."""
    if not GEO_PATH.exists():
        raise HTTPException(404, "Bundled boundary file not found")
    payload = _cached("geo:india_states", lambda: json.loads(GEO_PATH.read_text(encoding="utf-8")))
    return JSONResponse(content=payload, headers={"Cache-Control": "public, max-age=3600"})


# ---- Custom Dataset Studio Engine Endpoints ----------------------------------
@app.get("/api/custom-datasets")
def list_custom_datasets():
    """List all available datasets in Dataset Studio."""
    seed_demo_datasets()
    datasets = []
    for file in sorted(CUSTOM_DIR.iterdir()):
        if file.is_file() and not file.name.startswith("."):
            stat = file.stat()
            # Quick estimate row count
            try:
                records = parse_file_to_records(file)
                row_count = len(records)
                cols = list(records[0].keys()) if records else []
            except Exception:
                row_count = 0
                cols = []

            datasets.append({
                "id": file.name,
                "name": file.stem.replace("_", " ").title(),
                "filename": file.name,
                "size_bytes": stat.st_size,
                "size_formatted": f"{stat.st_size / 1024:.1f} KB" if stat.st_size < 1024 * 1024 else f"{stat.st_size / (1024*1024):.2f} MB",
                "row_count": row_count,
                "column_count": len(cols),
                "columns": cols[:8],
                "modified_at": stat.st_mtime,
                "is_demo": file.name in [
                    "global_cyber_threat_telemetry.csv",
                    "india_state_cyber_infrastructure.csv",
                    "financial_fraud_surveillance.csv"
                ]
            })
    return {"datasets": datasets}


@app.post("/api/custom-datasets/upload")
async def upload_custom_dataset(file: UploadFile = File(...)):
    """Upload a custom dataset (CSV, TSV, JSON, JSONL, Parquet) into Dataset Studio."""
    filename = file.filename or "uploaded_dataset.csv"
    ext = Path(filename).suffix.lower()
    allowed_exts = [".csv", ".tsv", ".tab", ".json", ".jsonl", ".ndjson", ".parquet", ".xlsx", ".xls"]

    if ext not in allowed_exts:
        raise HTTPException(
            400,
            f"Unsupported file format '{ext}'. Supported formats: CSV, TSV, JSON, JSONL, Parquet, Excel."
        )

    # Sanitize filename
    safe_stem = re.sub(r"[^a-zA-Z0-9_\-]", "_", Path(filename).stem)
    target_name = f"{safe_stem}_{uuid.uuid4().hex[:6]}{ext}"
    target_path = CUSTOM_DIR / target_name

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(400, "Uploaded file is completely empty.")
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(400, "File exceeds maximum upload size (50MB).")

        with open(target_path, "wb") as f:
            f.write(content)

        # Validate that it parses
        records = parse_file_to_records(target_path)
        if not records:
            target_path.unlink(missing_ok=True)
            raise HTTPException(400, "File could not be parsed or contains no data rows.")

        profile = profile_dataset(records)
        return {
            "status": "success",
            "message": f"Successfully uploaded '{filename}' with {len(records)} rows.",
            "dataset": {
                "id": target_name,
                "name": safe_stem.replace("_", " ").title(),
                "filename": target_name,
                "row_count": len(records),
                "column_count": profile["column_count"],
            },
            "profile": profile
        }
    except HTTPException:
        raise
    except Exception as e:
        target_path.unlink(missing_ok=True)
        raise HTTPException(500, f"Dataset processing error: {e}")


@app.get("/api/custom-datasets/{dataset_id}/profile")
def get_custom_dataset_profile(dataset_id: str):
    """Retrieve full statistical schema and recommendation profile for a dataset."""
    target_path = CUSTOM_DIR / dataset_id
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(404, f"Dataset '{dataset_id}' not found.")

    try:
        records = parse_file_to_records(target_path)
        return profile_dataset(records)
    except Exception as e:
        raise HTTPException(500, f"Failed to profile dataset: {e}")


@app.get("/api/custom-datasets/{dataset_id}/preview")
def preview_custom_dataset(
    dataset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: Optional[str] = "asc"
):
    """Paginated preview data grid with search and column sorting."""
    target_path = CUSTOM_DIR / dataset_id
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(404, f"Dataset '{dataset_id}' not found.")

    try:
        records = parse_file_to_records(target_path)
        total_rows = len(records)
        columns = list(records[0].keys()) if records else []

        # Filter
        if search and search.strip():
            q = search.strip().lower()
            records = [
                r for r in records
                if any(q in str(v).lower() for v in r.values())
            ]

        # Sort
        if sort_by and columns and sort_by in columns:
            reverse = (sort_dir or "asc").lower() == "desc"
            def _sort_key(item):
                val = item.get(sort_by)
                if val is None:
                    return ""
                try:
                    return float(str(val).replace(",", ""))
                except (ValueError, TypeError):
                    return str(val).lower()
            records.sort(key=_sort_key, reverse=reverse)

        # Slice
        start = (page - 1) * page_size
        end = start + page_size
        sliced = records[start:end]

        return {
            "columns": columns,
            "rows": sliced,
            "total_rows": total_rows,
            "filtered_rows": len(records),
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, math.ceil(len(records) / page_size))
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to read dataset preview: {e}")


@app.post("/api/custom-datasets/{dataset_id}/query")
def query_custom_dataset(
    dataset_id: str,
    body: Dict[str, Any] = Body(...)
):
    """Execute dynamic analytical aggregation query for 3D visualization rendering."""
    target_path = CUSTOM_DIR / dataset_id
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(404, f"Dataset '{dataset_id}' not found.")

    try:
        records = parse_file_to_records(target_path)
        x_col = body.get("x_col")
        y_col = body.get("y_col")
        z_col = body.get("z_col")
        color_col = body.get("color_col")
        size_col = body.get("size_col")
        agg_func = body.get("agg_func", "sum")
        filters = body.get("filters", {})
        limit = body.get("limit", 400)

        result = query_dataset(
            records,
            x_col=x_col,
            y_col=y_col,
            z_col=z_col,
            color_col=color_col,
            size_col=size_col,
            agg_func=agg_func,
            limit=limit,
            filters=filters
        )
        return result
    except Exception as e:
        raise HTTPException(500, f"Query execution failed: {e}")


@app.delete("/api/custom-datasets/{dataset_id}")
def delete_custom_dataset(dataset_id: str):
    """Delete a custom uploaded dataset (protected against deleting demo datasets)."""
    target_path = CUSTOM_DIR / dataset_id
    if not target_path.exists():
        raise HTTPException(404, f"Dataset '{dataset_id}' not found.")

    if dataset_id in [
        "global_cyber_threat_telemetry.csv",
        "india_state_cyber_infrastructure.csv",
        "financial_fraud_surveillance.csv"
    ]:
        raise HTTPException(400, "Cannot delete protected reference demo datasets.")

    try:
        target_path.unlink()
        return {"status": "success", "message": f"Dataset '{dataset_id}' removed."}
    except Exception as e:
        raise HTTPException(500, f"Failed to delete dataset: {e}")
