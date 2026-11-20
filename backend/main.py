from pathlib import Path
from functools import lru_cache
from time import monotonic
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "statewise_cyber_crimes_2020_2024.csv"
GEO_PATH = ROOT / "data" / "boundaries" / "india_states_geojson.json"
GEO_REMOTE_URL = "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson"
SOURCE_LINE = "NCRB, Crime in India; Ministry of Home Affairs / PIB (21 July 2026)"

app = FastAPI(title="India Cyber Crime Intelligence API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
@app.get("/api/health")
def health():
    return {"status": "ok", "engine": "Apache Spark SQL", "dataset": DATA.name}


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
        return {"year": year, "states": rows, "source": SOURCE_LINE}

    return _cached(f"states:{year}", compute)


@app.get("/api/overview")
def overview(year: int = 2024):
    _validate_year(year)

    def compute():
        rows = query_rows(f"""
            SELECT SUM(CASE WHEN category='State' THEN `{year}` ELSE 0 END) AS state_cases,
                   SUM(CASE WHEN category='Union Territory' THEN `{year}` ELSE 0 END) AS ut_cases,
                   SUM(`{year}`) AS total_cases, COUNT(*) AS jurisdictions
            FROM state_cyber_crimes
        """)[0]
        return {"year": year, **rows}

    return _cached(f"overview:{year}", compute)


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
    # NOTE: Spark's sql() has no named parameters; filter via the DataFrame API
    # instead to keep user-supplied names out of any SQL string.
    df = loaded_df().filter(F.lower(F.col("state_ut")) == safe).select(
        "state_ut", "category", *[F.col(c).cast("long").alias(c) for c in cols]
    ).collect()
    if not df:
        raise HTTPException(404, "State or Union Territory not found")
    return df[0].asDict()


@app.get("/api/state_trends/{state_name}")
def state_trends(state_name: str):
    return state_detail(state_name)


@app.get("/api/geo/india_states")
def geo_india_states():
    """Serve the bundled boundary GeoJSON so the map has no network dependency."""
    if GEO_PATH.exists():
        return JSONResponse(
            content=__import__("json").loads(GEO_PATH.read_text(encoding="utf-8")),
            headers={"Cache-Control": "public, max-age=3600"},
        )
    return JSONResponse(
        status_code=200,
        content={"fallback_url": GEO_REMOTE_URL, "note": "Local boundaries not bundled; use remote URL."},
    )
