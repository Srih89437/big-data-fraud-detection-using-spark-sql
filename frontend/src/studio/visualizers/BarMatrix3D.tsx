import { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Grid } from '@react-three/drei';
import type { QueryResult } from '../types';

interface BarMatrix3DProps {
  data: QueryResult;
  heightScale?: number;
  dark?: boolean;
}

function BarItem({
  x,
  z,
  height,
  width,
  record,
  maxVal,
  xCol,
  yCol,
  dark,
}: {
  x: number;
  z: number;
  height: number;
  width: number;
  record: Record<string, any>;
  maxVal: number;
  xCol: string;
  yCol: string;
  dark: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  const t = maxVal > 0 ? Math.min(1, Math.max(0, (record[yCol] ?? 0) / maxVal)) : 0;
  const baseColor = useMemo(() => {
    // Elegant warm amber-copper gradient
    const c1 = new THREE.Color(dark ? '#3b4856' : '#94a3b8');
    const c2 = new THREE.Color('#d97706');
    const c3 = new THREE.Color('#f59e0b');
    if (t < 0.5) return c1.lerp(c2, t * 2);
    return c2.lerp(c3, (t - 0.5) * 2);
  }, [t, dark]);

  const color = hovered ? new THREE.Color('#38bdf8') : baseColor;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const targetScaleY = hovered ? 1.06 : 1.0;
    meshRef.current.scale.y = THREE.MathUtils.damp(meshRef.current.scale.y, targetScaleY, 14, delta);
  });

  return (
    <group position={[x, height / 2, z]}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <boxGeometry args={[width, height, width]} />
        <meshStandardMaterial
          color={color}
          roughness={0.35}
          metalness={0.2}
          emissive={hovered ? new THREE.Color('#0284c7') : new THREE.Color('#000000')}
          emissiveIntensity={hovered ? 0.4 : 0}
        />
      </mesh>

      {hovered && (
        <Html position={[0, height / 2 + 0.35, 0]} center zIndexRange={[50, 0]} style={{ pointerEvents: 'none' }}>
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
            <div style={{ fontWeight: 600, color: '#38bdf8' }}>{String(record[xCol] ?? 'Point')}</div>
            <div style={{ marginTop: 2, fontSize: '12px', fontWeight: 700 }}>
              {yCol}: <span style={{ color: '#fbbf24' }}>{Number(record[yCol] ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export function BarMatrix3D({ data, heightScale = 1.0, dark = true }: BarMatrix3DProps) {
  const points = data.points || (data as any).records || [];
  const meta = data.meta || (data as any).metadata || {};
  const xCol = meta.x_col || 'x';
  const yCol = meta.y_col || 'val';
  const maxVal = meta.max_val || Math.max(1, ...points.map((p: any) => p.y_val ?? p[yCol] ?? 0));

  const barWidth = 0.5;
  const gap = 0.2;
  const step = barWidth + gap;

  // Layout items along a matrix or serpentine line
  const colsPerRow = Math.max(1, Math.ceil(Math.sqrt(points.length * 1.5)));

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [colsPerRow * step * 0.7, 7, colsPerRow * step * 0.9], fov: 42 }}
      >
        <ambientLight intensity={dark ? 0.7 : 0.9} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow />
        <directionalLight position={[-10, 10, -10]} intensity={0.4} color="#94a3b8" />

        <Grid
          args={[colsPerRow * step + 6, colsPerRow * step + 6]}
          sectionSize={step * 2}
          cellSize={step}
          cellColor={dark ? '#1e293b' : '#cbd5e1'}
          sectionColor={dark ? '#334155' : '#94a3b8'}
          fadeDistance={30}
          fadeStrength={1}
          position={[0, -0.01, 0]}
        />

        {points.map((p: any, i: number) => {
          const row = Math.floor(i / colsPerRow);
          const col = i % colsPerRow;
          const x = (col - colsPerRow / 2) * step;
          const z = (row - Math.ceil(points.length / colsPerRow) / 2) * step;
          const rawVal = p.y_val !== undefined ? Number(p.y_val) : Number(p[yCol] ?? 0);
          const height = Math.max(0.12, (maxVal > 0 ? (rawVal / maxVal) * 3.5 : 0.5) * heightScale);
          const rec = { ...p, [xCol]: p.x_label || p[xCol], [yCol]: rawVal };

          return (
            <BarItem
              key={i}
              x={x}
              z={z}
              height={height}
              width={barWidth}
              record={rec}
              maxVal={maxVal}
              xCol={xCol}
              yCol={yCol}
              dark={dark}
            />
          );
        })}

        <OrbitControls makeDefault minDistance={3} maxDistance={40} maxPolarAngle={Math.PI / 2 - 0.05} />
      </Canvas>
    </div>
  );
}
