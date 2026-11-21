// The 3D India Scene: Technical cartographic lighting, selectable state meshes,
// high-precision hover tooltips, concentric cartographic ground rings,
// 3D selected jurisdiction beacon, and adaptive labels.

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { ProjectedFeature } from '../lib/geo';
import { toScene, type Frame } from './geometry';
import { StateMesh } from './StateMesh';
import { CameraRig } from './CameraRig';

export interface MapSceneProps {
  ordered: ProjectedFeature[];
  frame: Frame;
  geometries: Map<string, THREE.ExtrudeGeometry>;
  depths?: Map<string, number>;
  /** 0..1 intensity per jurisdiction for the selected year. */
  intensity: Map<string, number>;
  /** Registered cases per jurisdiction (for the tooltip). */
  cases: Map<string, number>;
  selected: string | null;
  hovered: string | null;
  /** Reporting year shown in the hover tooltip. */
  year: number;
  onHover: (name: string | null) => void;
  onSelect: (name: string) => void;
  dark: boolean;
  showBorders?: boolean;
  showLabels?: boolean;
  renderMode?: 'prism' | 'column' | 'bubble' | 'bar_matrix' | 'relief' | 'choropleth';
  metricName?: string;
}

/** Ground plane with subtle cartographic concentric rings. */
function GroundRings({ dark }: { dark: boolean }) {
  const ringColor = dark ? '#223244' : '#d2c8b8';
  return (
    <group position={[0, -0.006, 0]}>
      {/* Shadow Catcher Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[44, 44]} />
        <shadowMaterial opacity={dark ? 0.48 : 0.22} color={dark ? '#000000' : '#1a2228'} />
      </mesh>

      {/* Concentric Cartographic Range Rings */}
      {[4, 7.5, 11].map((r, idx) => (
        <mesh key={idx} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <ringGeometry args={[r - 0.015, r, 64]} />
          <meshBasicMaterial color={ringColor} transparent opacity={dark ? 0.22 : 0.35} />
        </mesh>
      ))}
    </group>
  );
}

/** 3D Animated Beacon reticle hovering above the centroid of the selected state. */
function SelectionBeacon({
  feature,
  frame,
  depth = 0.5,
}: {
  feature: ProjectedFeature;
  frame: Frame;
  depth?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [x, z] = toScene(feature.centroid[0], feature.centroid[1], frame);
  const beaconY = depth + 0.38;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = beaconY + Math.sin(t * 2.5) * 0.04;
    groupRef.current.rotation.y = t * 0.8;
  });

  return (
    <group position={[x, beaconY, z]} ref={groupRef}>
      {/* Outer Rotating Reticle Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.26, 32]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* Inner Glowing Center Point */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#fef3c7" />
      </mesh>
      {/* Vertical Targeting Ray */}
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.44, 8]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.65} />
      </mesh>
    </group>
  );
}

function StateLabels({
  ordered,
  frame,
  depths,
  intensity,
  selected,
  hovered,
}: {
  ordered: ProjectedFeature[];
  frame: Frame;
  depths?: Map<string, number>;
  intensity: Map<string, number>;
  selected: string | null;
  hovered: string | null;
}) {
  const labels = useMemo(() => {
    const forced = new Set<string>();
    if (selected) forced.add(selected);
    if (hovered) forced.add(hovered);
    const rest = ordered
      .filter((f) => !forced.has(f.name))
      .sort((a, b) => (intensity.get(b.name) ?? 0) - (intensity.get(a.name) ?? 0))
      .slice(0, 8);
    return [...forced, ...rest.map((f) => f.name)];
  }, [ordered, intensity, selected, hovered]);

  const byName = useMemo(() => new Map(ordered.map((f) => [f.name, f])), [ordered]);

  return (
    <>
      {labels.map((name) => {
        const f = byName.get(name);
        if (!f) return null;
        const [x, z] = toScene(f.centroid[0], f.centroid[1], frame);
        const active = name === selected || name === hovered;
        const elevation = (depths?.get(name) ?? 0.35) + 0.16;
        return (
          <Html
            key={name}
            position={[x, elevation, z]}
            center
            zIndexRange={[20, 0]}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <div
              style={{
                fontFamily: 'var(--font-sans, "DM Sans", sans-serif)',
                fontWeight: active ? 700 : 500,
                fontSize: active ? '11px' : '9.5px',
                letterSpacing: '0.03em',
                color: active ? '#f59e0b' : 'rgba(235, 240, 245, 0.78)',
                background: active ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.68)',
                border: active ? '1px solid rgba(245, 158, 11, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                padding: active ? '2px 7px' : '1px 5px',
                borderRadius: '4px',
                textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                whiteSpace: 'nowrap',
                transform: 'translateY(-6px)',
                backdropFilter: 'blur(4px)',
                boxShadow: active ? '0 2px 10px rgba(245, 158, 11, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {name}
            </div>
          </Html>
        );
      })}
    </>
  );
}

function HoverTooltip({
  feature,
  cases,
  frame,
  year,
  metricName = 'REGISTERED FIRs',
  depth = 0.4,
}: {
  feature: ProjectedFeature;
  cases: Map<string, number>;
  frame: Frame;
  year: number;
  metricName?: string;
  depth?: number;
}) {
  const [x, z] = toScene(feature.centroid[0], feature.centroid[1], frame);
  const count = cases.get(feature.name) ?? 0;

  const totalNational = useMemo(() => {
    let sum = 0;
    for (const v of cases.values()) sum += v;
    return sum;
  }, [cases]);

  const share = totalNational > 0 ? ((count / totalNational) * 100).toFixed(1) : '0';

  return (
    <Html
      position={[x, depth + 0.32, z]}
      center
      zIndexRange={[40, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        style={{
          background: 'rgba(12, 17, 24, 0.96)',
          border: '1px solid rgba(245, 158, 11, 0.45)',
          borderRadius: 8,
          padding: '10px 14px',
          minWidth: 180,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(245, 158, 11, 0.15)',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'none',
          transform: 'translateY(-14px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-sans, "DM Sans", sans-serif)',
              fontWeight: 700,
              fontSize: '13px',
              color: '#f8fafc',
            }}
          >
            {feature.name}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono, "DM Mono", monospace)',
              fontWeight: 600,
              fontSize: '9px',
              color: '#d97706',
              background: 'rgba(217, 119, 6, 0.15)',
              padding: '2px 5px',
              borderRadius: '3px',
              letterSpacing: '0.04em',
            }}
          >
            {feature.category === 'Union Territory' ? 'UT' : 'STATE'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-heading, "Manrope", sans-serif)',
              fontWeight: 800,
              fontSize: '20px',
              letterSpacing: '-0.03em',
              color: '#fbbf24',
            }}
          >
            {count.toLocaleString('en-IN')}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono, "DM Mono", monospace)',
              fontSize: '9.5px',
              color: '#94a3b8',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {metricName} ({year})
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 6,
            paddingTop: 6,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono, "DM Mono", monospace)',
            color: '#94a3b8',
          }}
        >
          <span>Share: <strong style={{ color: '#e2e8f0' }}>{share}%</strong> of India</span>
          <span style={{ color: '#38bdf8', fontSize: '9px' }}>Click to open dossier ↗</span>
        </div>
      </div>
    </Html>
  );
}

export function MapScene({
  ordered,
  frame,
  geometries,
  depths,
  intensity,
  cases,
  selected,
  hovered,
  year,
  onHover,
  onSelect,
  dark,
  showBorders = true,
  showLabels = true,
  renderMode = 'prism',
  metricName = 'REGISTERED FIRs',
}: MapSceneProps) {
  const hoveredFeature = hovered ? ordered.find((f) => f.name === hovered) ?? null : null;
  const selectedFeature = selected ? ordered.find((f) => f.name === selected) ?? null : null;

  return (
    <>
      <CameraRig />

      {/* Balanced Precision Lighting */}
      <ambientLight intensity={dark ? 0.6 : 0.8} />
      <directionalLight
        position={[8, 14, 8]}
        intensity={dark ? 1.45 : 1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-far={45}
        shadow-bias={-0.0003}
      />
      <directionalLight position={[-8, 6, -6]} intensity={dark ? 0.35 : 0.4} color="#94a3b8" />
      <directionalLight position={[0, -5, 10]} intensity={dark ? 0.2 : 0.25} color="#e08244" />

      <GroundRings dark={dark} />

      {ordered.map((f) => {
        const geom = geometries.get(f.name);
        if (!geom) return null;
        return (
          <StateMesh
            key={f.name}
            name={f.name}
            geometry={geom}
            intensity={intensity.get(f.name) ?? 0}
            isSelected={selected === f.name}
            isHovered={hovered === f.name}
            showBorders={showBorders}
            onHover={onHover}
            onSelect={onSelect}
          />
        );
      })}

      {/* 3D Column Mode: Vertical Cylindrical Pillars at Centroids */}
      {renderMode === 'column' &&
        ordered.map((f) => {
          const [x, z] = toScene(f.centroid[0], f.centroid[1], frame);
          const d = depths?.get(f.name) ?? 0.1;
          const colHeight = Math.max(0.1, d * 3.2);
          const isSel = selected === f.name;
          const isHov = hovered === f.name;
          return (
            <mesh
              key={`col-${f.name}`}
              position={[x, colHeight / 2, z]}
              castShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelect(f.name);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHover(f.name);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                onHover(null);
              }}
            >
              <cylinderGeometry args={[0.08, 0.08, colHeight, 16]} />
              <meshStandardMaterial
                color={isSel ? '#fbbf24' : isHov ? '#f59e0b' : '#e07a38'}
                emissive={isSel ? '#d97706' : isHov ? '#b45309' : '#000000'}
                roughness={0.25}
                metalness={0.6}
              />
            </mesh>
          );
        })}

      {/* 3D Bubble Cluster Mode: Floating Glowing Spheres at Centroids */}
      {renderMode === 'bubble' &&
        ordered.map((f) => {
          const [x, z] = toScene(f.centroid[0], f.centroid[1], frame);
          const count = cases.get(f.name) ?? 0;
          const maxCases = Math.max(...Array.from(cases.values()), 1);
          const radius = 0.08 + Math.sqrt(count / maxCases) * 0.35;
          const isSel = selected === f.name;
          const isHov = hovered === f.name;
          return (
            <mesh
              key={`bubble-${f.name}`}
              position={[x, radius + 0.12, z]}
              castShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelect(f.name);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHover(f.name);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                onHover(null);
              }}
            >
              <sphereGeometry args={[radius, 24, 24]} />
              <meshStandardMaterial
                color={isSel ? '#fbbf24' : isHov ? '#f59e0b' : '#e07a38'}
                emissive={isSel ? '#d97706' : '#c25e20'}
                emissiveIntensity={isSel ? 0.6 : 0.25}
                roughness={0.15}
                metalness={0.4}
                transparent
                opacity={0.88}
              />
            </mesh>
          );
        })}

      {/* 3D Bar Matrix Mode: Precision Rectangular Towers at Centroids */}
      {renderMode === 'bar_matrix' &&
        ordered.map((f) => {
          const [x, z] = toScene(f.centroid[0], f.centroid[1], frame);
          const d = depths?.get(f.name) ?? 0.1;
          const barHeight = Math.max(0.12, d * 3.4);
          const isSel = selected === f.name;
          const isHov = hovered === f.name;
          return (
            <mesh
              key={`bar-${f.name}`}
              position={[x, barHeight / 2, z]}
              castShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelect(f.name);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHover(f.name);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                onHover(null);
              }}
            >
              <boxGeometry args={[0.12, barHeight, 0.12]} />
              <meshStandardMaterial
                color={isSel ? '#fbbf24' : isHov ? '#f59e0b' : '#d97706'}
                roughness={0.3}
                metalness={0.5}
              />
            </mesh>
          );
        })}

      {/* 3D Reticle on Selected State */}
      {selectedFeature && (
        <SelectionBeacon
          feature={selectedFeature}
          frame={frame}
          depth={depths?.get(selectedFeature.name)}
        />
      )}

      {showLabels && (
        <StateLabels
          ordered={ordered}
          frame={frame}
          depths={depths}
          intensity={intensity}
          selected={selected}
          hovered={hovered}
        />
      )}

      {hoveredFeature && (
        <HoverTooltip
          feature={hoveredFeature}
          cases={cases}
          frame={frame}
          year={year}
          metricName={metricName}
          depth={depths?.get(hoveredFeature.name)}
        />
      )}
    </>
  );
}
