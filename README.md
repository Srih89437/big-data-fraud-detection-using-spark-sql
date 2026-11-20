# India Cyber Crime Intelligence — upgraded project

This upgrade adds a React dashboard with an animated interactive India state map, state/UT drill-down, year selector (2020–2024), national totals, search, CSV export, and a FastAPI backend whose aggregations execute through Apache Spark SQL.

## Data integrity
- `data/statewise_cyber_crimes_2020_2024.csv` contains 28 states and 8 Union Territories, with cases registered for 2020–2024.
- Source: NCRB, *Crime in India*, published by Ministry of Home Affairs / Press Information Bureau on 21 July 2026: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2287039&lang=1&reg=3
- This dataset is registered cybercrime cases, not all reported complaints, convictions, individual financial transactions, or population-adjusted rates.
- The earlier `data/india_cyber_crimes.csv` from theMapsDaily remains separate. It is national aggregate indicator data and cannot provide state-level values.
- The geographic boundary file is loaded from the public GeoJSON URL in `frontend/src/App.tsx`; an internet connection is required for map outlines. The table and data API remain available without the boundary file.
- State boundary names in the external GeoJSON may vary; unmatched names remain visible in the jurisdiction table rather than being assigned fabricated map values.

## Prerequisites
- Python 3.12
- Java 17 (already installed in your environment)
- Node.js 20+ and npm

## Run backend (PowerShell)
```powershell
cd C:\Users\srih8\downloads\BigData-Fraud-Detection
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.main:app --reload --port 8000
```
If you already have the project's `.venv`, activate it and run only the `pip install` command.

## Run frontend (new PowerShell terminal)
```powershell
cd C:\Users\srih8\downloads\BigData-Fraud-Detection\frontend
npm install
npm run dev
```
Open http://localhost:5173.

## Original Streamlit prototype
The original `app.py` and `src/` Spark SQL files are preserved. Run `streamlit run app.py` if you want to compare with the earlier prototype. Its built-in synthetic demo data is not used by the new React dashboard.

## Notes
- First backend query starts Spark and may take a little time.
- The 3D-like depth comes from the map's interactive choropleth, shadows and animated state selection; the map is an SVG geographic view, not a fabricated 3D globe.
- The national five-year total trend is from the official all-India totals in the cited NCRB table.
