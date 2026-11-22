// Geospatial helpers: WGS84 loading, jurisdiction-name normalisation,
// Conic Conformal projection (standard for Survey of India cartography),
// polylabel interior centroid computation, and geometry extraction for the 3D map.
// Every boundary originates from the bundled, validated GeoJSON.

import * as d3 from 'd3-geo';
import polylabel from 'polylabel';
import { API_BASE } from './api';

// Minimal local GeoJSON types so the app does not depend on @types/geojson.
export interface GeoJsonPosition {
  0: number;
  1: number;
  [i: number]: number;
}
export type GeoJsonPolygon = GeoJsonPosition[][];
export type GeoJsonMultiPolygon = GeoJsonPolygon[];
export interface GeoJsonGeometry {
  type: 'Polygon' | 'MultiPolygon' | string;
  coordinates?: GeoJsonPolygon | GeoJsonMultiPolygon;
}
export interface GeoJsonFeature {
  type: 'Feature';
  properties?: Record<string, unknown> | null;
  geometry?: GeoJsonGeometry | null;
}
export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export interface Ring {
  /** Projected plane coordinates [x, y], in map units. */
  points: [number, number][];
}

export interface ProjectedFeature {
  /** Jurisdiction name as written in the GeoJSON (may carry diacritics). */
  geoName: string;
  /** Canonical dataset jurisdiction name (matches data/statewise_cyber_crimes_2020_2024.csv). */
  name: string;
  /** ISO 3166-2:IN code (e.g. IN-TG, IN-KA, IN-DL). */
  code: string;
  category: 'State' | 'Union Territory';
  /** Outer rings (one per polygon part; islands are separate parts). */
  outers: Ring[];
  /** Holes per outer ring index. */
  holes: Ring[][];
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  /** Exact visual interior centroid computed via polylabel. */
  centroid: [number, number];
}

// ---------------------------------------------------------------------------
// ISO 3166-2:IN standard codes
// ---------------------------------------------------------------------------

export const STATE_TO_CODE: Record<string, string> = {
  'Andhra Pradesh': 'IN-AP',
  'Arunachal Pradesh': 'IN-AR',
  Assam: 'IN-AS',
  Bihar: 'IN-BR',
  Chhattisgarh: 'IN-CT',
  Goa: 'IN-GA',
  Gujarat: 'IN-GJ',
  Haryana: 'IN-HR',
  'Himachal Pradesh': 'IN-HP',
  Jharkhand: 'IN-JH',
  Karnataka: 'IN-KA',
  Kerala: 'IN-KL',
  'Madhya Pradesh': 'IN-MP',
  Maharashtra: 'IN-MH',
  Manipur: 'IN-MN',
  Meghalaya: 'IN-ML',
  Mizoram: 'IN-MZ',
  Nagaland: 'IN-NL',
  Odisha: 'IN-OR',
  Punjab: 'IN-PB',
  Rajasthan: 'IN-RJ',
  Sikkim: 'IN-SK',
  'Tamil Nadu': 'IN-TN',
  Telangana: 'IN-TG',
  Tripura: 'IN-TR',
  'Uttar Pradesh': 'IN-UP',
  Uttarakhand: 'IN-UT',
  'West Bengal': 'IN-WB',
  'Andaman and Nicobar Islands': 'IN-AN',
  Chandigarh: 'IN-CH',
  'Dadra and Nagar Haveli and Daman and Diu': 'IN-DH',
  Delhi: 'IN-DL',
  'Jammu and Kashmir': 'IN-JK',
  Ladakh: 'IN-LA',
  Lakshadweep: 'IN-LD',
  Puducherry: 'IN-PY',
};

const codeToState: Record<string, string> = {};
for (const [name, code] of Object.entries(STATE_TO_CODE)) {
  codeToState[code] = name;
  codeToState[code.slice(3)] = name;
}

export const CODE_TO_STATE = codeToState;

// ---------------------------------------------------------------------------
// Name normalisation
// ---------------------------------------------------------------------------

/** Strip diacritics: 'Mahārāshtra' -> 'Maharashtra'. */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Normalised key used to match GeoJSON names to dataset jurisdiction names. */
export function normaliseName(s: string): string {
  return stripDiacritics(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Residual alias table for boundary names that still differ after diacritic
 * stripping. Keys and values are normalised (see normaliseName).
 */
const ALIASES: Record<string, string> = {
  'andaman and nicobar': 'andaman and nicobar islands',
  'andaman & nicobar islands': 'andaman and nicobar islands',
  'dadra and nagar haveli': 'dadra and nagar haveli and daman and diu',
  'daman and diu': 'dadra and nagar haveli and daman and diu',
  'nct of delhi': 'delhi',
  'jammu & kashmir': 'jammu and kashmir',
  orissa: 'odisha',
  uttaranchal: 'uttarakhand',
  pondicherry: 'puducherry',
};

export const DATASET_JURISDICTIONS: readonly string[] = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const CANONICAL: Map<string, string> = new Map(
  DATASET_JURISDICTIONS.map((n) => [normaliseName(n), n]),
);

const UT_KEYS: ReadonlySet<string> = new Set(
  [
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry',
  ].map(normaliseName),
);

export function isUnionTerritory(name: string): boolean {
  return UT_KEYS.has(normaliseName(name));
}

export function resolveJurisdictionName(geoName: string): string {
  const key = normaliseName(geoName);
  const aliased = ALIASES[key] ?? key;
  return CANONICAL.get(aliased) ?? geoName;
}

// ---------------------------------------------------------------------------
// Projection: Lambert Conic Conformal standard for India
// Parallels: [12.5, 32.0], Origin/Rotation: [-82, -22]
// ---------------------------------------------------------------------------

const indiaProjection = d3
  .geoConicConformal()
  .parallels([12.5, 32.0])
  .rotate([-82, -22])
  .scale(1000)
  .translate([0, 0]);

/** Project WGS84 [lon, lat] -> [x, y] */
export function project(lon: number, lat: number): [number, number] {
  const pt = indiaProjection([lon, lat]);
  return pt ? [pt[0], pt[1]] : [0, 0];
}

// ---------------------------------------------------------------------------
// GeoJSON loading
// ---------------------------------------------------------------------------

let geoPromise: Promise<GeoJsonFeatureCollection> | null = null;

export function loadIndiaGeoJSON(): Promise<GeoJsonFeatureCollection> {
  if (!geoPromise) {
    geoPromise = (async () => {
      const sources = ['/geo/india-states.geojson', `${API_BASE}/api/geo/india_states`];
      let lastError: unknown = null;
      for (const url of sources) {
        try {
          const r = await fetch(url);
          if (!r.ok) throw new Error(`Boundary file unavailable (HTTP ${r.status})`);
          return (await r.json()) as GeoJsonFeatureCollection;
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError instanceof Error ? lastError : new Error('Boundary file unavailable');
    })();
    geoPromise.catch(() => {
      geoPromise = null;
    });
  }
  return geoPromise;
}

// ---------------------------------------------------------------------------
// Geometry extraction & Polylabel interior anchors
// ---------------------------------------------------------------------------

type Pos = [number, number];

function ringPoints(ring: Pos[]): [number, number][] {
  return ring.map(([lon, lat]) => project(lon, lat));
}

function bboxOfPoints(pts: [number, number][]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function projectFeature(feature: GeoJsonFeature): ProjectedFeature | null {
  const geoName = ((feature.properties?.shapeName || feature.properties?.ST_NM) as string | undefined) ?? '';
  if (!geoName || !feature.geometry) return null;
  const geom = feature.geometry;
  const polygons: Pos[][][] =
    geom.type === 'Polygon'
      ? [geom.coordinates as Pos[][]]
      : geom.type === 'MultiPolygon'
        ? (geom.coordinates as Pos[][][])
        : [];

  const outers: Ring[] = [];
  const holes: Ring[][] = [];
  let largestRing: [number, number][] | null = null;
  let largestRingHoles: [number, number][][] = [];
  let largestArea = -1;

  for (const poly of polygons) {
    if (!poly.length) continue;
    const outer = ringPoints(poly[0] as Pos[]);
    if (outer.length < 3) continue;
    outers.push({ points: outer });

    const polyHoles: Ring[] = [];
    const currentHolesForPoly: [number, number][][] = [];
    for (let h = 1; h < poly.length; h++) {
      const hole = ringPoints(poly[h] as Pos[]);
      if (hole.length >= 3) {
        polyHoles.push({ points: hole });
        currentHolesForPoly.push(hole);
      }
    }
    holes.push(polyHoles);

    // Approximate area via bounding box
    const b = bboxOfPoints(outer);
    const area = (b.maxX - b.minX) * (b.maxY - b.minY);
    if (area > largestArea) {
      largestArea = area;
      largestRing = outer;
      largestRingHoles = currentHolesForPoly;
    }
  }
  if (!outers.length || !largestRing) return null;

  // Bbox over all parts
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const o of outers) {
    const b = bboxOfPoints(o.points);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }

  // Exact interior centroid via polylabel on the primary landmass
  let centroid: [number, number];
  try {
    const polygonInput = [largestRing, ...largestRingHoles];
    const pt = polylabel(polygonInput, 1.0);
    centroid = [pt[0], pt[1]];
  } catch {
    const lb = bboxOfPoints(largestRing);
    centroid = [(lb.minX + lb.maxX) / 2, (lb.minY + lb.maxY) / 2];
  }

  const resolved = resolveJurisdictionName(geoName);
  const code = STATE_TO_CODE[resolved] ?? 'IN-XX';
  const category: 'State' | 'Union Territory' = isUnionTerritory(resolved)
    ? 'Union Territory'
    : 'State';

  return {
    geoName,
    name: resolved,
    code,
    category,
    outers,
    holes,
    bbox: { minX, minY, maxX, maxY },
    centroid,
  };
}

export function projectAll(
  collection: GeoJsonFeatureCollection,
): Map<string, ProjectedFeature> {
  const out = new Map<string, ProjectedFeature>();
  for (const f of collection.features) {
    const pf = projectFeature(f);
    if (pf && !out.has(pf.name)) out.set(pf.name, pf);
  }
  return out;
}

export function unionBBox(feats: Iterable<ProjectedFeature>) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of feats) {
    minX = Math.min(minX, f.bbox.minX);
    minY = Math.min(minY, f.bbox.minY);
    maxX = Math.max(maxX, f.bbox.maxX);
    maxY = Math.max(maxY, f.bbox.maxY);
  }
  return { minX, minY, maxX, maxY };
}
