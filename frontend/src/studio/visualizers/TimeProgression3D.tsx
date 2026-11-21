import { useMemo, useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Grid } from '@react-three/drei';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import type { QueryResult } from '../types';

interface TimeProgression3DProps {
  data: QueryResult;
  timeCol?: string;
  dark?: boolean;
}

function TimeBarItem({
  x,
  z,
  height,
  label,
  value,
  dark,
}: {
  x: number;
  z: number;
  height: number;
  label: string;
  value: number;
  dark: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentHeight = useRef(0.05);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    currentHeight.current = THREE.MathUtils.damp(currentHeight.current, height, 10, delta);
    meshRef.current.scale.y = Math.max(0.01, currentHeight.current);
    meshRef.current.position.y = (currentHeight.current * 0.8) / 2;
  });

  const t = Math.min(1, Math.max(0, height / 3.0));
  const color = new THREE.Color(dark ? '#38bdf8' : '#0284c7').lerp(new THREE.Color('#f59e0b'), t);

  return (
    <group position={[x, 0, z]}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.8, 0.55]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      <Html position={[0, -0.2, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{ color: '#94a3b8', fontSize: '9px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {label.slice(0, 10)}
        </div>
      </Html>
    </group>
  );
}

export function TimeProgression3D({ data, timeCol = 'Date', dark = true }: TimeProgression3DProps) {
  const records = data.points || (data as any).records || [];
  const meta = data.meta || (data as any).metadata || {};
  const yCol = meta.y_col || 'val';

  // Group or sort records by time
  const timeFrames = useMemo(() => {
    const map = new Map<string, Record<string, any>[]>();
    for (const r of records) {
      const key = String(r[timeCol] || r['Month'] || r['Date'] || r['z_label'] || 'T0');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const keys = Array.from(map.keys()).slice(0, 24); // Up to 24 time steps
    return keys.map((key) => ({
      time: key,
      items: map.get(key) || [],
    }));
  }, [records, timeCol]);

  const [frameIdx, setFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<number | null>(null);

  const currentFrame = timeFrames[frameIdx] || timeFrames[0] || { time: 'N/A', items: [] };

  useEffect(() => {
    if (!isPlaying || timeFrames.length <= 1) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    timerRef.current = window.setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % timeFrames.length);
    }, 1000 / speed);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, timeFrames.length]);

  const items = currentFrame.items.slice(0, 18);
  const maxVal = Math.max(1, ...items.map((it) => Number(it[yCol] ?? 0)));

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ position: [6, 6, 6], fov: 42 }}>
        <ambientLight intensity={dark ? 0.7 : 0.9} />
        <directionalLight position={[8, 12, 8]} intensity={1.5} castShadow />

        <Grid
          args={[12, 12]}
          sectionSize={2}
          cellSize={1}
          cellColor={dark ? '#1e293b' : '#cbd5e1'}
          sectionColor={dark ? '#334155' : '#94a3b8'}
          fadeDistance={25}
          fadeStrength={1}
          position={[0, -0.01, 0]}
        />

        {items.map((it, i) => {
          const count = items.length;
          const cols = Math.ceil(Math.sqrt(count));
          const row = Math.floor(i / cols);
          const col = i % cols;
          const x = (col - cols / 2) * 1.1;
          const z = (row - Math.ceil(count / cols) / 2) * 1.1;
          const val = Number(it[yCol] ?? 0);
          const height = Math.max(0.1, (val / maxVal) * 3.2);

          return (
            <TimeBarItem
              key={i}
              x={x}
              z={z}
              height={height}
              label={String(it.x_label || it[meta.x_col || ''] || `P${i + 1}`)}
              value={val}
              dark={dark}
            />
          );
        })}

        <OrbitControls makeDefault minDistance={3} maxDistance={20} maxPolarAngle={Math.PI / 2 - 0.05} />
      </Canvas>

      {/* Floating 4D Time Playback Control Deck */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 30,
        }}
      >
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: isPlaying ? '#e11d48' : '#f59e0b',
            border: 'none',
            borderRadius: 6,
            color: '#ffffff',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          <span>{isPlaying ? 'Pause' : 'Play 4D'}</span>
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            setFrameIdx(0);
          }}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: '#94a3b8',
            padding: '6px',
            cursor: 'pointer',
          }}
          title="Restart Timeline"
        >
          <RotateCcw size={12} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>TIMESTEP:</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, timeFrames.length - 1)}
            value={frameIdx}
            onChange={(e) => {
              setIsPlaying(false);
              setFrameIdx(Number(e.target.value));
            }}
            style={{ width: 100, accentColor: '#f59e0b', cursor: 'pointer' }}
          />
          <strong style={{ fontSize: '11px', color: '#fbbf24', fontFamily: 'monospace', minWidth: 60 }}>
            {currentFrame.time}
          </strong>
        </div>

        <button
          onClick={() => setSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 0.5 : 1))}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: '#38bdf8',
            fontSize: '10px',
            fontFamily: 'monospace',
            padding: '4px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <FastForward size={11} />
          <span>{speed}×</span>
        </button>
      </div>
    </div>
  );
}
