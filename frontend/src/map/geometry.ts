// Builds Three.js geometries from the projected boundary features.
// Coordinates are normalised so the whole country fits a stable, centred frame.
// Orientation is strictly North-Up: 3D scene point [X, Elevation, Z] has:
//   X = West (-) to East (+)
//   Elevation = Height (Y up)
//   Z = North (-) to South (+)

import * as THREE from 'three';
import type { ProjectedFeature } from '../lib/geo';

/** Target half-extent of the country on the X axis, in scene units. */
export const SCENE_SCALE = 5;

export interface Frame {
  /** World-space offset applied after scaling so the country is centred at origin. */
  offsetX: number;
  offsetY: number;
  /** Metres per scene unit. */
  scale: number;
  width: number;
  height: number;
}

/** Compute the normalisation frame from the union bbox of all features. */
export function computeFrame(
  bboxes: { minX: number; minY: number; maxX: number; maxY: number }[],
): Frame {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of bboxes) {
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const scale = (SCENE_SCALE * 2) / Math.max(w, h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    offsetX: -cx * scale,
    offsetY: -cy * scale,
    scale,
    width: w * scale,
    height: h * scale,
  };
}

/** Transform a projected plane point [x, y] into scene [x, z]. */
export function toScene(
  x: number,
  y: number,
  frame: Frame,
): [number, number] {
  return [x * frame.scale + frame.offsetX, y * frame.scale + frame.offsetY];
}

function shapeFromRing(
  points: [number, number][],
  frame: Frame,
): THREE.Shape {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => {
    const [sx, sy] = toScene(x, y, frame);
    // Negate sy for 2D shape so that rotateX(-Math.PI/2) produces +sy along Z.
    // In 2D: (sx, -sy).
    // After rotation by -PI/2 around X:
    //   X_3d = sx
    //   Z_3d = -Y_2d = -(-sy) = +sy.
    if (i === 0) shape.moveTo(sx, -sy);
    else shape.lineTo(sx, -sy);
  });
  shape.closePath();
  return shape;
}

/**
 * Build an extruded geometry for one jurisdiction.
 * Island parts (separate outer rings) become additional shapes in the same geometry.
 * `depth` is the extrusion height in scene units (data-driven elevation).
 */
export function buildStateGeometry(
  feature: ProjectedFeature,
  frame: Frame,
  depth: number,
): THREE.ExtrudeGeometry {
  const shapes: THREE.Shape[] = [];
  feature.outers.forEach((outer, idx) => {
    const shape = shapeFromRing(outer.points, frame);
    const holes = feature.holes[idx];
    if (holes) {
      for (const hole of holes) {
        const holePath = new THREE.Path();
        hole.points.forEach(([x, y], i) => {
          const [sx, sy] = toScene(x, y, frame);
          if (i === 0) holePath.moveTo(sx, -sy);
          else holePath.lineTo(sx, -sy);
        });
        holePath.closePath();
        shape.holes.push(holePath);
      }
    }
    shapes.push(shape);
  });

  const geom = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });

  // ExtrudeGeometry extrudes along +Z (in 2D coordinate system).
  // Rotate by -PI/2 so that 2D Y becomes 3D -Z, meaning Y_2d (-sy) becomes Z_3d (+sy).
  // The extrusion direction (originally +Z in 2D) becomes +Y in 3D.
  geom.rotateX(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

/** Axis-aligned bounds of a feature in scene space (for camera framing). */
export function sceneBounds(
  feature: ProjectedFeature,
  frame: Frame,
): { minX: number; minZ: number; maxX: number; maxZ: number } {
  const [x0, z0] = toScene(feature.bbox.minX, feature.bbox.minY, frame);
  const [x1, z1] = toScene(feature.bbox.maxX, feature.bbox.maxY, frame);
  return {
    minX: Math.min(x0, x1),
    minZ: Math.min(z0, z1),
    maxX: Math.max(x0, x1),
    maxZ: Math.max(z0, z1),
  };
}
