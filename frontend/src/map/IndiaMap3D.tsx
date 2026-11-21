// Public 3D Map Component: WebGL hardware validation, lazy scene mounting,
// camera framing helpers, tour playback deck, camera angle presets,
// and quick-jump hotspot / island territory focus chips.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Compass,
  Pause,
  Play,
  RotateCcw,
  Square,
  Crosshair,
  Navigation as NavigationIcon,
  Layers,
  Sliders,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { ProjectedFeature } from '../lib/geo';
import { toScene, type Frame } from './geometry';
import { sceneUnionBounds, useMapData, type RenderMode3D } from './useMapData';
import { cameraStore, useCameraStore } from './cameraStore';
import { MapScene } from './MapScene';

export interface IndiaMap3DProps {
  cases: Map<string, number>;
  selected: string | null;
  year: number;
  dark: boolean;
  onHover?: (name: string | null) => void;
  onSelect: (name: string) => void;
  /** Compact mode drops the tour bar (used for the overview preview). */
  compact?: boolean;
}

type TourStop =
  | { label: string; kind: 'india' }
  | { label: string; kind: 'state'; name: string };

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

function frameFeature(f: ProjectedFeature, frame: Frame) {
  const [x, z] = toScene(f.centroid[0], f.centroid[1], frame);
  const w = (f.bbox.maxX - f.bbox.minX) * frame.scale;
  const h = (f.bbox.maxY - f.bbox.minY) * frame.scale;
  const size = Math.max(w, h, 0.4);
  const dist = size * 2.6 + 1.6;
  return {
    position: [x + dist * 0.42, dist * 0.95, z + dist * 0.62] as [number, number, number],
    target: [x, 0, z] as [number, number, number],
    distance: dist,
  };
}

function frameIndia(frame: Frame, ordered: ProjectedFeature[]) {
  const b = sceneUnionBounds(ordered, frame);
  if (!b) return { position: [0, 12, 9] as [number, number, number], target: [0, 0, 0] as [number, number, number] };
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const w = b.maxX - b.minX;
  const h = b.maxZ - b.minZ;
  const span = Math.max(w, h);
  return {
    position: [cx + span * 0.18, span * 1.15, cz + span * 0.78] as [number, number, number],
    target: [cx, 0, cz] as [number, number, number],
  };
}

function frameOrtho(frame: Frame, ordered: ProjectedFeature[]) {
  const b = sceneUnionBounds(ordered, frame);
  if (!b) return { position: [0, 15, 0.01] as [number, number, number], target: [0, 0, 0] as [number, number, number] };
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
  return {
    position: [cx, span * 1.35, cz + 0.001] as [number, number, number],
    target: [cx, 0, cz] as [number, number, number],
  };
}

function framePerspective(frame: Frame, ordered: ProjectedFeature[]) {
  const b = sceneUnionBounds(ordered, frame);
  if (!b) return { position: [0, 8, 12] as [number, number, number], target: [0, 0, 0] as [number, number, number] };
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
  return {
    position: [cx - span * 0.35, span * 0.75, cz + span * 0.95] as [number, number, number],
    target: [cx, 0, cz] as [number, number, number],
  };
}

const QUICK_HOTSPOTS = ['Telangana', 'Maharashtra', 'Karnataka', 'Uttar Pradesh', 'Delhi'];
const QUICK_ISLANDS = ['Andaman and Nicobar Islands', 'Lakshadweep'];

export function IndiaMap3D({
  cases,
  selected,
  year,
  dark,
  onHover,
  onSelect,
  compact = false,
}: IndiaMap3DProps) {
  const [webgl] = useState(hasWebGL);
  const [hovered, setHovered] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode3D>('prism');
  const [heightScale, setHeightScale] = useState<number>(1.2);
  const [showBorders, setShowBorders] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const camera = useCameraStore();
  const tourTimer = useRef<number | null>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
    }
  };

  const intensity = useMemo(() => {
    const out = new Map<string, number>();
    let max = 0;
    for (const v of cases.values()) max = Math.max(max, v);
    for (const [k, v] of cases) out.set(k, max > 0 ? v / max : 0);
    return out;
  }, [cases]);

  const mapData = useMapData({ cases, year, heightScale, renderMode });

  const tourStops = useMemo<TourStop[]>(() => {
    if (!mapData.ready) return [];
    const byCases = [...mapData.ordered].sort((a, b) => (cases.get(b.name) ?? 0) - (cases.get(a.name) ?? 0));
    const top = byCases.slice(0, 8);
    return [
      { label: 'National Overview', kind: 'india' as const },
      ...top.map((f) => ({ label: f.name, kind: 'state' as const, name: f.name })),
    ];
  }, [mapData.ready, mapData.ordered, cases]);

  const flyToStop = useCallback(
    (index: number) => {
      const stop = tourStops[index];
      if (!stop || !mapData.ready) return;
      if (stop.kind === 'india') {
        const f = frameIndia(mapData.frame, mapData.ordered);
        cameraStore.flyTo(f.position, f.target, 1.6);
        setHovered(null);
      } else {
        const feat = mapData.features.get(stop.name);
        if (!feat) return;
        const f = frameFeature(feat, mapData.frame);
        cameraStore.flyTo(f.position, f.target, 1.5);
        setHovered(stop.name);
      }
    },
    [tourStops, mapData],
  );

  useEffect(() => {
    if (camera.tour !== 'playing' || tourStops.length === 0) {
      if (tourTimer.current) {
        window.clearInterval(tourTimer.current);
        tourTimer.current = null;
      }
      return;
    }
    const ms = Math.round(4200 / camera.tourSpeed);
    tourTimer.current = window.setInterval(() => {
      const next = (cameraStore.getSnapshot().tourIndex + 1) % tourStops.length;
      cameraStore.setTourIndex(next);
      flyToStop(next);
    }, ms);
    return () => {
      if (tourTimer.current) window.clearInterval(tourTimer.current);
    };
  }, [camera.tour, camera.tourSpeed, tourStops.length, flyToStop]);

  const didInitialFly = useRef(false);
  useEffect(() => {
    if (!mapData.ready || didInitialFly.current) return;
    didInitialFly.current = true;
    const f = frameIndia(mapData.frame, mapData.ordered);
    cameraStore.flyTo(f.position, f.target, 1.7);
  }, [mapData.ready, mapData]);

  const lastSelected = useRef<string | null>(selected);
  useEffect(() => {
    if (!selected || !mapData.ready || selected === lastSelected.current) return;
    lastSelected.current = selected;
    const feat = mapData.features.get(selected);
    if (!feat) return;
    const f = frameFeature(feat, mapData.frame);
    cameraStore.flyTo(f.position, f.target, 1.4);
  }, [selected, mapData]);

  const resetView = useCallback(() => {
    if (!mapData.ready) return;
    const f = frameIndia(mapData.frame, mapData.ordered);
    cameraStore.flyTo(f.position, f.target, 1.3);
  }, [mapData]);

  const setOrthoView = useCallback(() => {
    if (!mapData.ready) return;
    const f = frameOrtho(mapData.frame, mapData.ordered);
    cameraStore.flyTo(f.position, f.target, 1.3);
  }, [mapData]);

  const setPerspectiveView = useCallback(() => {
    if (!mapData.ready) return;
    const f = framePerspective(mapData.frame, mapData.ordered);
    cameraStore.flyTo(f.position, f.target, 1.3);
  }, [mapData]);

  const jumpToJurisdiction = useCallback(
    (name: string) => {
      if (!mapData.ready) return;
      const feat = mapData.features.get(name);
      if (feat) {
        const f = frameFeature(feat, mapData.frame);
        cameraStore.flyTo(f.position, f.target, 1.4);
      }
      onSelect(name);
    },
    [mapData, onSelect],
  );

  if (!webgl) {
    return (
      <div className="map-fallback">
        <AlertTriangle size={16} />
        <div>
          <strong>Hardware WebGL Acceleration Unavailable</strong>
          <p>
            WebGL is disabled in your browser environment. Please enable hardware acceleration in your
            browser settings to experience the interactive 3D choropleth.
          </p>
        </div>
      </div>
    );
  }

  if (mapData.error) {
    return (
      <div className="map-fallback">
        <AlertTriangle size={16} />
        <div>
          <strong>Boundary Dataset Error</strong>
          <p>{mapData.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`map3d-wrapper ${compact ? 'compact-wrapper' : ''} ${isFullscreen ? 'fullscreen-map' : ''}`}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 12, 9], fov: 40, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={() => onHover?.(null)}
      >
        <Suspense fallback={null}>
          {mapData.ready && (
            <MapScene
              ordered={mapData.ordered}
              frame={mapData.frame}
              geometries={mapData.geometries}
              depths={mapData.depths}
              intensity={intensity}
              cases={cases}
              selected={selected}
              hovered={hovered}
              year={year}
              showBorders={showBorders}
              showLabels={showLabels}
              onHover={(n) => {
                setHovered(n);
                onHover?.(n);
              }}
              onSelect={onSelect}
              dark={dark}
            />
          )}
        </Suspense>
      </Canvas>

      {!mapData.ready && (
        <div className="map3d-loading">
          <div className="map-loader-spinner" />
          <span>Synthesizing 36 administrative boundaries…</span>
        </div>
      )}

      {/* Floating Precision Camera Deck & Guided Tour Bar */}
      {!compact && (
        <div className="map-controls-overlay">
          {/* Top Left: Perspective Presets */}
          <div className="camera-presets-bar">
            <span className="preset-label">ANGLE:</span>
            <button
              className="preset-btn"
              onClick={resetView}
              title="Overview (National framing)"
            >
              Overview
            </button>
            <button
              className="preset-btn"
              onClick={setOrthoView}
              title="Top-Down 2D Cartographic Angle"
            >
              Top-Down
            </button>
            <button
              className="preset-btn"
              onClick={setPerspectiveView}
              title="Cinematic 3D Angle"
            >
              Perspective
            </button>
          </div>

          {/* Top Center: 3D Visualization Controls Bar */}
          <div className="map-render-controls">
            <div className="map-render-mode-group" title="3D Visualization Style">
              <button
                className={`map-render-mode-btn ${renderMode === 'prism' ? 'active' : ''}`}
                onClick={() => setRenderMode('prism')}
                title="3D Extruded Prism Columns"
              >
                3D Prism
              </button>
              <button
                className={`map-render-mode-btn ${renderMode === 'relief' ? 'active' : ''}`}
                onClick={() => setRenderMode('relief')}
                title="2.5D Topographic Elevation Relief"
              >
                2.5D Relief
              </button>
              <button
                className={`map-render-mode-btn ${renderMode === 'choropleth' ? 'active' : ''}`}
                onClick={() => setRenderMode('choropleth')}
                title="Flat Surface Choropleth"
              >
                Choropleth
              </button>
            </div>

            {renderMode !== 'choropleth' && (
              <div className="map-scale-slider-wrap" title="Adjust 3D Extrusion Elevation Scale">
                <span>ELEV:</span>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.1"
                  value={heightScale}
                  onChange={(e) => setHeightScale(parseFloat(e.target.value))}
                />
                <span>{heightScale.toFixed(1)}×</span>
              </div>
            )}

            <button
              className={`map-toggle-btn ${showBorders ? 'active' : ''}`}
              onClick={() => setShowBorders((prev) => !prev)}
              title="Toggle State Boundary Lines"
            >
              <Layers size={11} />
              <span>Borders</span>
            </button>

            <button
              className={`map-toggle-btn ${showLabels ? 'active' : ''}`}
              onClick={() => setShowLabels((prev) => !prev)}
              title="Toggle State Names and Micro-Tags"
            >
              <span>Labels</span>
            </button>

            <button
              className="map-toggle-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
            </button>
          </div>

          {/* Top Right: Cartographic Compass & Coordinate Readout */}
          <div className="map-compass-hud" title="Geographic Orientation: True North">
            <div className="compass-rose">
              <NavigationIcon size={12} className="compass-needle" />
              <span>N</span>
            </div>
            <div className="coord-readout">
              <span>WGS84</span>
              <small>20.59° N, 78.96° E</small>
            </div>
          </div>

          {/* Quick Jurisdiction Jump Bar (Bottom Right) */}
          <div className="quick-jump-bar">
            <span className="quick-jump-title">
              <Crosshair size={11} />
              <span>FLY TO:</span>
            </span>
            <div className="quick-jump-chips">
              {QUICK_HOTSPOTS.map((name) => (
                <button
                  key={name}
                  className={`quick-chip ${selected === name ? 'active-chip' : ''}`}
                  onClick={() => jumpToJurisdiction(name)}
                  title={`Center camera on ${name}`}
                >
                  {name}
                </button>
              ))}
              <span className="quick-chip-sep">|</span>
              {QUICK_ISLANDS.map((name) => (
                <button
                  key={name}
                  className={`quick-chip island-chip ${selected === name ? 'active-chip' : ''}`}
                  onClick={() => jumpToJurisdiction(name)}
                  title={`Inspect island jurisdiction: ${name}`}
                >
                  {name === 'Andaman and Nicobar Islands' ? 'Andaman & Nicobar' : 'Lakshadweep'}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Left: Guided Tour Controls */}
          <div className="tour-control-deck">
            <div className="tour-action-row">
              <button
                className="tour-btn primary-tour-btn"
                title={camera.tour === 'playing' ? 'Pause tour' : 'Start guided intelligence tour'}
                onClick={() => {
                  if (camera.tour === 'playing') {
                    cameraStore.setTour('paused');
                  } else {
                    cameraStore.setTour('playing');
                    flyToStop(camera.tourIndex);
                  }
                }}
                disabled={tourStops.length === 0}
              >
                {camera.tour === 'playing' ? <Pause size={13} /> : <Play size={13} />}
                <span>
                  {camera.tour === 'playing'
                    ? 'Pause'
                    : camera.tour === 'paused'
                      ? 'Resume Tour'
                      : 'Start Tour'}
                </span>
              </button>

              <button
                className="tour-btn ghost-tour-btn"
                title="Previous stop"
                onClick={() => {
                  const i = (camera.tourIndex - 1 + tourStops.length) % Math.max(1, tourStops.length);
                  cameraStore.setTourIndex(i);
                  flyToStop(i);
                }}
                disabled={tourStops.length === 0}
              >
                <ChevronLeft size={14} />
              </button>

              <button
                className="tour-btn ghost-tour-btn"
                title="Next stop"
                onClick={() => {
                  const i = (camera.tourIndex + 1) % Math.max(1, tourStops.length);
                  cameraStore.setTourIndex(i);
                  flyToStop(i);
                }}
                disabled={tourStops.length === 0}
              >
                <ChevronRight size={14} />
              </button>

              <button
                className="tour-btn ghost-tour-btn"
                title="Stop tour"
                onClick={() => {
                  cameraStore.setTour('idle');
                  cameraStore.setTourIndex(0);
                  setHovered(null);
                  resetView();
                }}
                disabled={camera.tour === 'idle'}
              >
                <Square size={12} />
              </button>

              <button
                className="tour-btn ghost-tour-btn"
                title="Reset Camera Framing"
                onClick={resetView}
              >
                <RotateCcw size={13} />
              </button>

              <div className="tour-speed-select" title="Camera Fly-to Speed">
                <Compass size={12} />
                <select
                  value={camera.tourSpeed}
                  onChange={(e) => cameraStore.setTourSpeed(Number(e.target.value))}
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1.0×</option>
                  <option value={1.5}>1.5×</option>
                  <option value={2}>2.0×</option>
                </select>
              </div>
            </div>

            {tourStops.length > 0 && (
              <div className="tour-progress-status">
                <span className="status-indicator-dot" />
                <span>
                  {camera.tour === 'idle'
                    ? 'Tour Ready · Press Start to tour top cybercrime hotspots'
                    : `Stop ${camera.tourIndex + 1} of ${tourStops.length} · ${tourStops[camera.tourIndex]?.label ?? ''}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
