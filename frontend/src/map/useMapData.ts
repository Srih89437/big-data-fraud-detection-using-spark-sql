// Loads and prepares everything the 3D map needs: boundary features, projection
// frame and per-jurisdiction extruded geometries. Built once, cached for reuse.

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { loadIndiaGeoJSON, projectAll, unionBBox, type ProjectedFeature } from '../lib/geo';
import { buildStateGeometry, computeFrame, toScene, type Frame } from './geometry';

export type RenderMode3D = 'prism' | 'relief' | 'choropleth' | 'column' | 'bubble';

export interface MapData {
  features: Map<string, ProjectedFeature>;
  ordered: ProjectedFeature[];
  frame: Frame;
  geometries: Map<string, THREE.ExtrudeGeometry>;
  depths: Map<string, number>;
  ready: boolean;
  error: string | null;
}

export interface MapDataOptions {
  /** Case counts keyed by jurisdiction name; drives extrusion depth. */
  cases: Map<string, number>;
  year?: number;
  heightScale?: number;
  renderMode?: RenderMode3D;
}

/**
 * Data-driven elevation scale:
 * Square-root height function: base ~0.04, max ~0.65.
 * Prevents skyscraper walls from occluding northern/interior states.
 */
export function depthFor(
  cases: number,
  maxCases: number,
  renderMode: RenderMode3D = 'prism',
  heightScale: number = 1.0,
): number {
  if (renderMode === 'choropleth') return 0.05;
  if (maxCases <= 0) return 0.04 * heightScale;
  const ratio = Math.max(0, cases) / maxCases;
  const t = Math.sqrt(ratio);
  if (renderMode === 'relief') {
    return (0.04 + 0.32 * t) * heightScale;
  }
  // 'prism' / 'column' / default: standard evidential survey height
  return (0.04 + 0.61 * t) * heightScale;
}

export function useMapData(options: MapDataOptions): MapData {
  const [raw, setRaw] = useState<{
    features: Map<string, ProjectedFeature>;
    ordered: ProjectedFeature[];
    frame: Frame;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { cases, year = 2024, heightScale = 1.0, renderMode = 'prism' } = options;

  useEffect(() => {
    let cancelled = false;
    loadIndiaGeoJSON()
      .then((collection) => {
        if (cancelled) return;
        const features = projectAll(collection);
        if (features.size === 0) throw new Error('Boundary file contained no usable features');
        const ordered = [...features.values()].sort((a, b) => a.name.localeCompare(b.name));
        const frame = computeFrame(ordered.map((f) => f.bbox));
        setRaw({ features, ordered, frame });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { geometries, depths } = useMemo(() => {
    const geomMap = new Map<string, THREE.ExtrudeGeometry>();
    const depthMap = new Map<string, number>();
    if (!raw) return { geometries: geomMap, depths: depthMap };

    let maxCases = 0;
    for (const f of raw.ordered) {
      maxCases = Math.max(maxCases, cases.get(f.name) ?? 0);
    }
    for (const f of raw.ordered) {
      const depth = depthFor(cases.get(f.name) ?? 0, maxCases, renderMode, heightScale);
      depthMap.set(f.name, depth);
      geomMap.set(f.name, buildStateGeometry(f, raw.frame, depth));
    }
    return { geometries: geomMap, depths: depthMap };
  }, [raw, cases, year, heightScale, renderMode]);

  // Dispose geometries when the component unmounts or the source data changes.
  useEffect(() => {
    return () => {
      for (const g of geometries.values()) g.dispose();
    };
  }, [geometries]);

  return {
    features: raw?.features ?? new Map(),
    ordered: raw?.ordered ?? [],
    frame: raw?.frame ?? computeFrame([]),
    geometries,
    depths,
    ready: raw !== null,
    error,
  };
}

/** Overall scene bounds of every feature (used for zoom-to-fit). */
export function sceneUnionBounds(
  ordered: ProjectedFeature[],
  frame: Frame,
): { minX: number; minZ: number; maxX: number; maxZ: number } | null {
  if (!ordered.length) return null;
  const bb = unionBBox(ordered);
  const [x0, z0] = toScene(bb.minX, bb.minY, frame);
  const [x1, z1] = toScene(bb.maxX, bb.maxY, frame);
  return {
    minX: Math.min(x0, x1),
    minZ: Math.min(z0, z1),
    maxX: Math.max(x0, x1),
    maxZ: Math.max(z0, z1),
  };
}
