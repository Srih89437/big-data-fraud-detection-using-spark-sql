import { useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { QueryResult } from '../types';

interface SurfaceTerrain3DProps {
  data: QueryResult;
  heightScale?: number;
  dark?: boolean;
}

export function SurfaceTerrain3D({ data, heightScale = 1.0, dark = true }: SurfaceTerrain3DProps) {
  const records = data.points || (data as any).records || [];
  const meta = data.meta || (data as any).metadata || {};
  const yCol = meta.y_col || 'val';
  const maxVal = meta.max_val || 1;

  const resolution = 24;
  const { geometry } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(8, 8, resolution, resolution);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const count = records.length;
    for (let i = 0; i < pos.count; i++) {
      // Sample dataset records or create interpolated wave elevation
      const recIdx = i % Math.max(1, count);
      const val = Number((records[recIdx] as any)?.y_val ?? records[recIdx]?.[yCol] ?? 0);
      const norm = maxVal > 0 ? Math.min(1, Math.max(0, val / maxVal)) : 0;

      // Add gentle topographical interpolation
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const wave = Math.sin(x * 0.8) * Math.cos(z * 0.8) * 0.4;
      const elevation = (norm * 2.2 + wave) * heightScale;
      pos.setY(i, Math.max(0, elevation));

      // Color based on height
      const t = Math.min(1, Math.max(0, elevation / 2.5));
      const c = new THREE.Color('#1e293b').lerp(new THREE.Color('#d97706'), t * 0.7);
      if (t > 0.6) c.lerp(new THREE.Color('#fbbf24'), (t - 0.6) * 2.5);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return { geometry: geo };
  }, [records, yCol, maxVal, heightScale]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ position: [8, 6, 8], fov: 40 }}>
        <ambientLight intensity={dark ? 0.7 : 0.9} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow />

        <mesh geometry={geometry} receiveShadow castShadow>
          <meshStandardMaterial
            vertexColors
            roughness={0.45}
            metalness={0.15}
            flatShading
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Wireframe Contour Overlay */}
        <mesh geometry={geometry} position={[0, 0.005, 0]}>
          <meshBasicMaterial
            wireframe
            color={dark ? '#fbbf24' : '#b45309'}
            transparent
            opacity={0.15}
          />
        </mesh>

        <OrbitControls makeDefault minDistance={3} maxDistance={25} maxPolarAngle={Math.PI / 2 - 0.05} />
      </Canvas>
    </div>
  );
}
