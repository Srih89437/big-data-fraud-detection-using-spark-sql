import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import type { QueryResult } from '../types';

interface ScatterPlot3DProps {
  data: QueryResult;
  dark?: boolean;
}

function PointItem({
  pos,
  record,
  color,
  xCol,
  yCol,
  zCol,
  colorCol,
}: {
  pos: [number, number, number];
  record: Record<string, any>;
  color: THREE.Color;
  xCol: string;
  yCol: string;
  zCol: string;
  colorCol?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={pos}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <sphereGeometry args={[hovered ? 0.16 : 0.1, 16, 16]} />
        <meshStandardMaterial
          color={hovered ? '#38bdf8' : color}
          emissive={hovered ? '#0284c7' : color}
          emissiveIntensity={hovered ? 0.6 : 0.25}
          roughness={0.2}
          metalness={0.5}
        />
      </mesh>

      {hovered && (
        <Html position={[0, 0.3, 0]} center zIndexRange={[50, 0]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              borderRadius: 6,
              padding: '6px 10px',
              color: '#f8fafc',
              fontSize: '11px',
              fontFamily: 'var(--font-mono, monospace)',
              whiteSpace: 'nowrap',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            <div>{xCol}: <strong>{record[xCol]}</strong></div>
            <div>{yCol}: <strong>{record[yCol]}</strong></div>
            <div>{zCol}: <strong>{record[zCol]}</strong></div>
            {colorCol && <div>{colorCol}: <strong style={{ color: '#fbbf24' }}>{record[colorCol]}</strong></div>}
          </div>
        </Html>
      )}
    </group>
  );
}

export function ScatterPlot3D({ data, dark = true }: ScatterPlot3DProps) {
  const records = data.points || (data as any).records || [];
  const meta = data.meta || (data as any).metadata || {};
  const xCol = meta.x_col || 'x';
  const yCol = meta.y_col || 'y';
  const zCol = meta.z_col || 'z';
  const colorCol = meta.color_col;

  // Compute extents
  const { points } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const r of records) {
      const vx = Number(r[xCol] ?? r.x_label ?? 0);
      const vy = Number(r[yCol] ?? r.y_val ?? 0);
      const vz = Number(r[zCol] ?? r.color_val ?? 0);
      if (!isNaN(vx)) { minX = Math.min(minX, vx); maxX = Math.max(maxX, vx); }
      if (!isNaN(vy)) { minY = Math.min(minY, vy); maxY = Math.max(maxY, vy); }
      if (!isNaN(vz)) { minZ = Math.min(minZ, vz); maxZ = Math.max(maxZ, vz); }
    }

    if (minX === Infinity) { minX = 0; maxX = 1; }
    if (minY === Infinity) { minY = 0; maxY = 1; }
    if (minZ === Infinity) { minZ = 0; maxZ = 1; }

    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const spanZ = maxZ - minZ || 1;

    const boxSize = 6;
    const half = boxSize / 2;

    const points = records.map((r: any) => {
      const vx = Number(r[xCol] ?? r.x_label ?? 0);
      const vy = Number(r[yCol] ?? r.y_val ?? 0);
      const vz = Number(r[zCol] ?? r.color_val ?? 0);
      const px = ((vx - minX) / spanX) * boxSize - half;
      const py = ((vy - minY) / spanY) * boxSize;
      const pz = ((vz - minZ) / spanZ) * boxSize - half;

      const t = (vy - minY) / spanY;
      const color = new THREE.Color('#38bdf8').lerp(new THREE.Color('#f59e0b'), t);
      const normalizedRecord = {
        ...r,
        [xCol]: r[xCol] ?? r.x_label ?? vx,
        [yCol]: r[yCol] ?? r.y_val ?? vy,
        [zCol]: r[zCol] ?? r.z_label ?? vz,
      };

      return {
        pos: [px, py, pz] as [number, number, number],
        record: normalizedRecord,
        color,
      };
    });

    return { points };
  }, [records, xCol, yCol, zCol]);

  const boxSize = 6;
  const half = boxSize / 2;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [7, 7, 7], fov: 42 }}>
        <ambientLight intensity={dark ? 0.7 : 0.9} />
        <directionalLight position={[10, 15, 10]} intensity={1.4} />

        {/* Bounding Coordinate Box Wireframe */}
        <group position={[0, boxSize / 2, 0]}>
          <Line
            points={[
              [-half, -half, -half], [half, -half, -half],
              [half, -half, half], [-half, -half, half],
              [-half, -half, -half],
            ]}
            color={dark ? '#334155' : '#cbd5e1'}
            lineWidth={1}
          />
          <Line
            points={[
              [-half, half, -half], [half, half, -half],
              [half, half, half], [-half, half, half],
              [-half, half, -half],
            ]}
            color={dark ? '#334155' : '#cbd5e1'}
            lineWidth={1}
          />
          {/* Vertical Pillars */}
          <Line points={[[-half, -half, -half], [-half, half, -half]]} color={dark ? '#1e293b' : '#e2e8f0'} lineWidth={1} />
          <Line points={[[half, -half, -half], [half, half, -half]]} color={dark ? '#1e293b' : '#e2e8f0'} lineWidth={1} />
          <Line points={[[half, -half, half], [half, half, half]]} color={dark ? '#1e293b' : '#e2e8f0'} lineWidth={1} />
          <Line points={[[-half, -half, half], [-half, half, half]]} color={dark ? '#1e293b' : '#e2e8f0'} lineWidth={1} />
        </group>

        {/* Axis Labels */}
        <Html position={[half + 0.4, 0, 0]} style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace' }}>
          X: {xCol}
        </Html>
        <Html position={[-half - 0.4, boxSize, 0]} style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace' }}>
          Y: {yCol}
        </Html>
        <Html position={[0, 0, half + 0.4]} style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace' }}>
          Z: {zCol}
        </Html>

        {/* Points */}
        {points.map((p, i) => (
          <PointItem
            key={i}
            pos={p.pos}
            record={p.record}
            color={p.color}
            xCol={xCol}
            yCol={yCol}
            zCol={zCol}
            colorCol={colorCol}
          />
        ))}

        <OrbitControls makeDefault minDistance={4} maxDistance={25} />
      </Canvas>
    </div>
  );
}
