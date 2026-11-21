// Selectable Jurisdiction in the 3D scene: extruded geometry with crisp cartographic
// edge lines, data-driven choropleth ramp, smooth hover/select lift, and pointer callbacks.

import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export interface StateMeshProps {
  name: string;
  geometry: THREE.ExtrudeGeometry;
  /** 0..1 choropleth intensity for the selected year. */
  intensity: number;
  isSelected: boolean;
  isHovered: boolean;
  showBorders?: boolean;
  onHover: (name: string | null) => void;
  onSelect: (name: string) => void;
}

/** Refined choropleth ramp: deep slate -> warm sand -> rich copper -> intense terracotta. */
const RAMP = ['#3b4856', '#72899d', '#d48a56', '#c9533b'] as const;

export function rampColor(intensity: number): THREE.Color {
  const t = Math.min(1, Math.max(0, intensity));
  if (t <= 0.08) return new THREE.Color(RAMP[0]);
  if (t <= 0.32) return new THREE.Color(RAMP[0]).lerp(new THREE.Color(RAMP[1]), (t - 0.08) / 0.24);
  if (t <= 0.70) return new THREE.Color(RAMP[1]).lerp(new THREE.Color(RAMP[2]), (t - 0.32) / 0.38);
  return new THREE.Color(RAMP[2]).lerp(new THREE.Color(RAMP[3]), (t - 0.70) / 0.30);
}

function StateMeshImpl({
  name,
  geometry,
  intensity,
  isSelected,
  isHovered,
  showBorders = true,
  onHover,
  onSelect,
}: StateMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseColor = useMemo(() => rampColor(intensity), [intensity]);

  // Crisp cartographic border lines
  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(geometry, 28);
  }, [geometry]);

  // Clean, high-grade color resolution
  const color = useMemo(() => {
    const c = baseColor.clone();
    if (isSelected) {
      c.lerp(new THREE.Color('#f59e0b'), 0.58);
    } else if (isHovered) {
      c.lerp(new THREE.Color('#fbbf24'), 0.45);
    }
    return c;
  }, [baseColor, isSelected, isHovered]);

  const emissive = useMemo(() => {
    if (isSelected) return new THREE.Color('#d97706').multiplyScalar(0.42);
    if (isHovered) return new THREE.Color('#f59e0b').multiplyScalar(0.24);
    return new THREE.Color('#000000');
  }, [isSelected, isHovered]);

  const edgeColor = useMemo(() => {
    if (isSelected) return new THREE.Color('#fbbf24');
    if (isHovered) return new THREE.Color('#fef3c7');
    return new THREE.Color('#22313f');
  }, [isSelected, isHovered]);

  // Two materials: cap (top face) + wall (side extrusion relief)
  const materials = useMemo(() => {
    const cap = new THREE.MeshStandardMaterial({
      color,
      emissive,
      roughness: 0.42,
      metalness: 0.12,
      flatShading: false,
    });
    // Distinct side walls: darker, more metallic relief accentuating the extrusion verticality
    const wallColor = color.clone().multiplyScalar(isSelected ? 0.72 : 0.48);
    const side = new THREE.MeshStandardMaterial({
      color: wallColor,
      emissive: emissive.clone().multiplyScalar(0.35),
      roughness: 0.62,
      metalness: 0.24,
      flatShading: true,
    });
    return [cap, side];
  }, [color, emissive, isSelected]);

  // Smooth physical lift animation on hover/select
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const targetY = isSelected ? 0.12 : isHovered ? 0.06 : 0;
    meshRef.current.position.y = THREE.MathUtils.damp(
      meshRef.current.position.y,
      targetY,
      12,
      delta,
    );
  });

  return (
    <group ref={meshRef as unknown as React.Ref<THREE.Group>}>
      <mesh
        geometry={geometry}
        material={materials}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(name);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(name);
        }}
      />

      {/* Cartographic Edge Linework */}
      {showBorders && (
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial
            color={edgeColor}
            transparent
            opacity={isSelected ? 0.95 : isHovered ? 0.8 : 0.45}
            linewidth={1}
          />
        </lineSegments>
      )}
    </group>
  );
}

export const StateMesh = memo(StateMeshImpl);
