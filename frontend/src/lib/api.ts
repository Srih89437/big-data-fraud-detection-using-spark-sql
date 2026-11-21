// Typed client for the Spark SQL backend. All dashboard figures come from these calls.

import type {
  BootstrapResponse,
  MatrixResponse,
  OverviewResponse,
  StateDetailResponse,
  StatesResponse,
  TrendsResponse,
  YearsResponse,
} from './types';

export const API_BASE: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE ?? 'http://localhost:8000';

/** In-flight + resolved cache so re-visiting a section never refires the same request. */
const cache = new Map<string, Promise<unknown>>();

async function getJSON<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const cached = cache.get(url);
  if (cached) return cached as Promise<T>;
  const p = fetch(url).then(async (r) => {
    if (!r.ok) {
      let detail = `HTTP ${r.status}`;
      try {
        const body = (await r.json()) as { detail?: string };
        if (body.detail) detail = body.detail;
      } catch {
        /* non-JSON error body */
      }
      throw new Error(detail);
    }
    return (await r.json()) as T;
  });
  cache.set(url, p);
  // Drop rejected promises so a retry is possible after the backend recovers.
  p.catch(() => cache.delete(url));
  return p;
}

export const fetchBootstrap = () => getJSON<BootstrapResponse>('/api/bootstrap');
export const fetchYears = () => getJSON<YearsResponse>('/api/years');
export const fetchStates = (year: number) =>
  getJSON<StatesResponse>(`/api/states?year=${year}`);
export const fetchOverview = (year: number) =>
  getJSON<OverviewResponse>(`/api/overview?year=${year}`);
export const fetchTrends = () => getJSON<TrendsResponse>('/api/trends');
export const fetchStateDetail = (name: string) =>
  getJSON<StateDetailResponse>(`/api/state/${encodeURIComponent(name)}`);
export const fetchMatrix = (year: number) =>
  getJSON<MatrixResponse>(`/api/matrix?year=${year}`);

/** Prefetch application data on hover of "Open the app" CTA */
export function prefetchAppData(year = 2024): void {
  void fetchOverview(year);
  void fetchStates(year);
  void fetchTrends();
  void fetchMatrix(year);
}

/** Hard-refresh every cached endpoint (used by the retry affordance). */
export function clearApiCache(): void {
  cache.clear();
}
