// Shared API and domain types. Every value here originates from the Spark SQL backend.

/** One row of GET /api/matrix?year=YYYY */
export interface MatrixRow {
  code: string;
  state_ut: string;
  category: 'State' | 'Union Territory';
  cases: number;
  rank: number;
  share: number;
  yoy_change: number | null;
  cagr_5yr: number | null;
  total_cases_5yr: number;
  /** [c2020, c2021, c2022, c2023, c2024] */
  sparkline: number[];
  history: Record<string, number>;
}

/** Response of GET /api/matrix?year=YYYY */
export interface MatrixResponse {
  year: number;
  total_cases: number;
  jurisdiction_count: number;
  matrix: MatrixRow[];
  source: string;
}

export type JurisdictionCategory = 'State' | 'Union Territory';

/** One row of GET /api/states?year=YYYY */
export interface StateRow {
  state_ut: string;
  category: JurisdictionCategory;
  cases: number;
}

/** Response of GET /api/states?year=YYYY */
export interface StatesResponse {
  year: number;
  states: StateRow[];
  source: string;
}

/** Response of GET /api/overview?year=YYYY */
export interface OverviewResponse {
  year: number;
  state_cases: number;
  ut_cases: number;
  total_cases: number;
  jurisdictions: number;
}

/** Response of GET /api/state/{name} — years arrive as dynamic keys. */
export interface StateDetailResponse {
  state_ut: string;
  category: JurisdictionCategory;
  [year: string]: string | number;
}

export interface TrendPoint {
  year: number;
  cases: number;
}

/** Response of GET /api/trends */
export interface TrendsResponse {
  national_total: TrendPoint[];
  source: string;
}

/** Response of GET /api/years */
export interface YearsResponse {
  years: number[];
}
