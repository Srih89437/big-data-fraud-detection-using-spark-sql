import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Grid } from '@react-three/drei';
import type { QueryResult } from '../types';

interface BubbleCluster3DProps {
  data: QueryResult;
  dark?: boolean;
}

function BubbleItem({
  pos,
  radius,
  record,
  color,
  xCol,
  yCol,
  sizeCol,
}: {
  pos: [number, number, number];
  radius: number;
  record: Record<string, any>;
  color: THREE.Color;
  xCol: string;
  yCol: string;
  sizeCol?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={pos}>
      <mesh
        castShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshPhysicalMaterial
          color={hovered ? '#38bdf8' : color}
          transmission={0.4}
          opacity={0.88}
          transparent
          roughness={0.2}
          metalness={0.1}
          ior={1.4}
          emissive={hovered ? '#0284c7' : color}
          emissiveIntensity={hovered ? 0.5 : 0.15}
        />
      </mesh>

      {hovered && (
        <Html position={[0, radius + 0.3, 0]} center zIndexRange={[50, 0]} style={{ pointerEvents: 'none' }}>
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
            <div>{yCol}: <strong>{Number(record[yCol] ?? 0).toLocaleString()}</strong></div>
            {sizeCol && <div>{sizeCol}: <strong style={{ color: '#fbbf24' }}>{Number(record[sizeCol] ?? 0).toLocaleString()}</strong></div>}
          </div>
        </Html>
      )}
    </group>
  );
}

export function BubbleCluster3D({ data, dark = true }: BubbleCluster3DProps) {
  const records = data.points || (data as any).records || [];
  const meta = data.meta || (data as any).metadata || {};
  const xCol = meta.x_col || 'x';
  const yCol = meta.y_col || 'y';
  const sizeCol = meta.size_col || meta.y_col || 'val';

  const { bubbles } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minSize = Infinity, maxSize = -Infinity;

    for (const r of records) {
      const vx = Number(r[xCol] ?? r.x_label ?? 0);
      const vy = Number(r[yCol] ?? r.y_val ?? 0);
      const vs = Number(r[sizeCol] ?? r.size_val ?? r.y_val ?? 1);
      if (!isNaN(vx)) { minX = Math.min(minX, vx); maxX = Math.max(maxX, vx); }
      if (!isNaN(vy)) { minY = Math.min(minY, vy); maxY = Math.max(maxY, vy); }
      if (!isNaN(vs)) { minSize = Math.min(minSize, vs); maxSize = Math.max(maxSize, vs); }
    }

    if (minX === Infinity) { minX = 0; maxX = 1; }
    if (minY === Infinity) { minY = 0; maxY = 1; }
    if (minSize === Infinity) { minSize = 0; maxSize = 1; }

    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const spanSize = maxSize - minSize || 1;

    const spread = 7;
    const bubbles = records.map((r: any, i: number) => {
      const vx = Number(r[xCol] ?? r.x_label ?? 0);
      const vy = Number(r[yCol] ?? r.y_val ?? 0);
      const vs = Number(r[sizeCol] ?? r.size_val ?? r.y_val ?? 1);

      const px = ((vx - minX) / spanX) * spread - spread / 2;
      const py = Math.max(0.3, ((vy - minY) / spanY) * 4);
      // Gentle radial placement on Z for organic cluster separation
      const angle = (i / records.length) * Math.PI * 2;
      const pz = Math.sin(angle) * (spread * 0.4);

      const sizeNorm = (vs - minSize) / spanSize;
      const radius = 0.15 + sizeNorm * 0.55;

      const t = (vy - minY) / spanY;
      const color = new THREE.Color('#38bdf8').lerp(new THREE.Color('#f59e0b'), t);
      const rec = {
        ...r,
        [xCol]: r[xCol] ?? r.x_label ?? `Point ${i + 1}`,
        [yCol]: vy,
        [sizeCol]: vs,
      };

      return {
        pos: [px, py, pz] as [number, number, number],
        radius,
        record: rec,
        color,
      };
    });

    return { bubbles };
  }, [records, xCol, yCol, sizeCol]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ position: [8, 6, 8], fov: 42 }}>
        <ambientLight intensity={dark ? 0.7 : 0.9} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow />
        <directionalLight position={[-10, 8, -8]} intensity={0.5} color="#94a3b8" />

        <Grid
          args={[14, 14]}
          sectionSize={2}
          cellSize={1}
          cellColor={dark ? '#1e293b' : '#cbd5e1'}
          sectionColor={dark ? '#334155' : '#94a3b8'}
          fadeDistance={25}
          fadeStrength={1}
          position={[0, -0.01, 0]}
        />

        {bubbles.map((b, i) => (
          <BubbleItem
            key={i}
            pos={b.pos}
            radius={b.radius}
            record={b.record}
            color={b.color}
            xCol={xCol}
            yCol={yCol}
            sizeCol={sizeCol}
          />
        ))}

        <OrbitControls makeDefault minDistance={4} maxDistance={25} maxPolarAngle={Math.PI / 2 - 0.05} />
      </Canvas>
    </div>
  );
}
