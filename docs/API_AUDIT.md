# API Audit & Specification

## Overview
All endpoints are serviced by FastAPI using an Apache Spark 3.5 SQL engine connected to `data/statewise_cyber_crimes_2020_2024.csv`.
Every figure returned represents official police FIR registrations from NCRB, Crime in India.

---

## Audited Endpoints

### 1. `GET /api/health`
- **Purpose**: System health and Spark engine status
- **Response**:
  ```json
  {
    "status": "healthy",
    "spark_connected": true,
    "engine": "Apache Spark SQL 3.5",
    "dataset": "statewise_cyber_crimes_2020_2024.csv",
    "jurisdiction_count": 36,
    "years": [2020, 2021, 2022, 2023, 2024]
  }
  ```

### 2. `GET /api/overview?year={YYYY}`
- **Parameters**: `year` (int, default: 2024)
- **Response**:
  - `total_cases`: sum of all 36 jurisdictions
  - `state_cases`: sum of 28 states (e.g. 1,01,118 for 2024)
  - `ut_cases`: sum of 8 Union Territories (e.g. 810 for 2024)
  - `jurisdictions`: 36
  - `top_state`: object containing highest volume state details

### 3. `GET /api/states?year={YYYY}`
- **Parameters**: `year` (int, default: 2024)
- **Response**: Array of 36 jurisdictions with `code` (ISO 3166-2:IN), `state_ut`, `category`, and `cases`.

### 4. `GET /api/matrix?year={YYYY}`
- **Parameters**: `year` (int, default: 2024)
- **Purpose**: High-density multi-year matrix for Data Explorer and analytical engines.
- **Fields per row**:
  - `code`: ISO 3166-2 code (`IN-TG`, `IN-KA`, etc.)
  - `state_ut`: Name
  - `category`: 'State' | 'Union Territory'
  - `cases`: Cases in active year
  - `rank`: Rank 1..36
  - `share`: National percentage
  - `yoy_change`: Year-over-Year %
  - `cagr_5yr`: 5-year Compound Annual Growth Rate
  - `total_cases_5yr`: Cumulative 5-year sum
  - `sparkline`: 5-point array `[2020, 2021, 2022, 2023, 2024]`
  - `history`: Key-value map of years to case counts

### 5. `GET /api/trends`
- **Response**: 5-point national total series (2020: 50,035 to 2024: 1,01,928).

### 6. `GET /api/state/{name}`
- **Parameters**: `name` (URL-encoded jurisdiction name)
- **Response**: Full historical series for specified state/UT.

### 7. Dataset Studio Endpoints
- `POST /api/dataset/upload`: Upload tabular datasets
- `GET /api/dataset/active`: Metadata of current active dataset
- `GET /api/dataset/profile`: Statistical profiling (cardinality, null count, distributions)
- `GET /api/dataset/preview`: Sample rows with typed columns
- `GET /api/dataset/visualize`: Aggregated multi-dimensional data for 3D visualizers
