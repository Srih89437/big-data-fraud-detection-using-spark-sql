# Big Data Fraud Detection using Spark SQL

**India Cyber Crime Intelligence Platform**

A data analysis and visualization platform for police-registered cybercrime cases across the 28 States and 8 Union Territories of India, covering 2020 to 2024. The backend processes the data with Apache Spark SQL, and the React frontend presents it through an interactive 3D map, state profiles, national analytics, a data explorer, and a dataset upload tool.

> Developed by **Shrihari DG** as a college mini project.
> Contact: srih89437@gmail.com

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Data Source](#data-source)
- [Screenshots](#screenshots)
- [Limitations](#limitations)
- [Author](#author)
- [License](#license)

---

## Overview

Cybercrime registrations in India are published as state-wise totals, which are difficult to compare and explore directly. This project loads those figures into a Spark SQL pipeline, computes national totals, rankings, year-on-year changes, and concentration measures, and presents them in a single application that is consistent across every page.

All figures shown in the interface are computed from the backend API at runtime. No statistics are hard-coded in the frontend.

## Features

- **Overview:** national total, five-year trend, and the highest-volume jurisdictions for the selected year.
- **India 3D Map:** an extruded map of all 36 states and union territories with several view modes (prism, column, bubble, and bar matrix), a year timeline, state comparison, and a guided tour.
- **State Dossier:** per-jurisdiction profile with five-year trend, national share, rank, and year-on-year change.
- **National Analytics:** long-term trajectory, distribution between states and union territories, and rank movement across years.
- **Data Explorer:** sortable table of all jurisdictions with CSV export.
- **Dataset Studio:** upload CSV, TSV, JSON, or JSONL files, preview and profile the columns, map them to 3D charts, and export the result.
- **Methodology:** description of the data, the processing steps, and the limitations.
- **Command palette (Ctrl+K / ⌘K):** jump to any page, state, or year.
- **Keyboard navigation:** keys 1 to 7 switch between the main pages.

## Tech Stack

| Layer | Technologies |
|---|---|
| Data processing | Python, Apache Spark SQL (PySpark) |
| Backend API | FastAPI |
| Frontend | React, TypeScript, Vite |
| 3D visualization | Three.js, React Three Fiber, Drei |
| Charts | Recharts |
| Animation | Framer Motion |
| Map projection | D3 (d3-geo) |

## Architecture

```
  Source data (CSV, state-wise cases 2020–2024)
            │
            ▼
  Apache Spark SQL  ──  aggregation, ranking, YoY change, shares
            │
            ▼
  FastAPI backend   ──  cached JSON endpoints
            │
            ▼
  React frontend    ──  3D map, dossiers, analytics, explorer, studio
```

## Project Structure

```
big-data-fraud-detection-using-spark-sql/
├── backend/          # FastAPI application and Spark SQL queries
├── frontend/         # React + Vite application
│   ├── src/
│   │   ├── components/   # Pages and shared UI
│   │   ├── map/          # 3D map components
│   │   └── studio/       # Dataset Studio visualizers
│   └── public/           # Static assets, favicon, map data
├── scripts/          # Test and data-validation scripts
├── docs/             # Project documentation
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.9 or later
- Java 8, 11, or 17 (required by Apache Spark)
- Node.js 18 or later and npm

### 1. Clone the repository

```bash
git clone https://github.com/Srih89437/big-data-fraud-detection-using-spark-sql.git
cd big-data-fraud-detection-using-spark-sql
```

### Install dependencies and run

```bash
python -m pip install -r backend/requirements.txt
npm install
npm --prefix frontend install
npm start
```

`npm start` launches the FastAPI backend and Vite frontend together. Open `http://localhost:5173`; the API is available at `http://127.0.0.1:8000`.

## Usage

1. Start the backend and the frontend as described above.
2. Open `http://localhost:5173` in your browser.
3. Use the sidebar to move between pages, or press keys 1 to 7.
4. Select a year with the timeline controls to update the map, rankings, and charts.
5. Click any state on the map to open its dossier and see its exact case count for the selected year.
6. In **Dataset Studio**, upload a CSV, Excel, or JSON file, choose the columns to map, and view the result as a 3D chart.

## Data Source

- **Scope:** police-registered cybercrime cases for the 28 States and 8 Union Territories of India, 2020 to 2024.
- **Source:** the dataset included in this repository. The citation is recorded in `docs/` and on the Methodology page.

Figures are shown as they appear in the source. Totals and derived values (shares, rankings, and year-on-year changes) are calculated by the application.

## Screenshots

Screenshots are in `qa/screenshots/`. Each page is captured at 1440×900 and 390×844:

| Page | 1440×900 | 390×844 |
|---|---|---|
| Overview | [Desktop](qa/screenshots/overview-1440x900.png) | [Mobile](qa/screenshots/overview-390x844.png) |
| India 3D Map | [Desktop](qa/screenshots/india-3d-map-1440x900.png) | [Mobile](qa/screenshots/india-3d-map-390x844.png) |
| State Dossier | [Desktop](qa/screenshots/state-dossier-1440x900.png) | [Mobile](qa/screenshots/state-dossier-390x844.png) |
| National Analytics | [Desktop](qa/screenshots/national-analytics-1440x900.png) | [Mobile](qa/screenshots/national-analytics-390x844.png) |
| Data Explorer | [Desktop](qa/screenshots/data-explorer-1440x900.png) | [Mobile](qa/screenshots/data-explorer-390x844.png) |
| Dataset Studio | [Desktop](qa/screenshots/dataset-studio-1440x900.png) | [Mobile](qa/screenshots/dataset-studio-390x844.png) |
| Methodology | [Desktop](qa/screenshots/methodology-1440x900.png) | [Mobile](qa/screenshots/methodology-390x844.png) |

## Limitations

- The data covers **registered cases only**. It does not represent all cybercrime, since many incidents are never reported.
- Figures reflect the source dataset and may be revised in later releases.
- Data uploaded in Dataset Studio is stored in the app's upload library and is not added to the project dataset.
- This is an academic project, not a government service. It should not be used for operational or legal decisions.

## Author

**Shrihari DG**
Email: srih89437@gmail.com
GitHub: [@Srih89437](https://github.com/Srih89437)

## License

MIT License. See the LICENSE file.
