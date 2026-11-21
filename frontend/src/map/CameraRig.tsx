// Camera rig: eases the camera toward commanded goals, and hands manual control
// back to OrbitControls as soon as the user interacts.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { cameraStore, useCameraStore } from './cameraStore';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface AnimState {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  elapsed: number;
  duration: number;
  nonce: number;
}

export function CameraRig() {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const store = useCameraStore();
  const anim = useRef<AnimState | null>(null);
  const goalNonce = useRef<number | null>(null);

  // Pick up new goals from the store.
  useEffect(() => {
    const goal = store.goal;
    if (!goal || goal.nonce === goalNonce.current) return;
    goalNonce.current = goal.nonce;
    const controls = controlsRef.current;
    const fromPos = camera.position.clone();
    const fromTarget = controls ? controls.target.clone() : new THREE.Vector3();
    anim.current = {
      fromPos,
      toPos: new THREE.Vector3(...goal.position),
      fromTarget,
      toTarget: new THREE.Vector3(...goal.target),
      elapsed: 0,
      duration: Math.max(0.2, goal.duration),
      nonce: goal.nonce,
    };
  }, [store.goal, camera]);

  // Cancel animation when the user grabs the map.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cancel = () => {
      anim.current = null;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, []);

  useFrame((_, delta) => {
    const a = anim.current;
    if (!a) return;
    a.elapsed += delta;
    const t = Math.min(1, a.elapsed / a.duration);
    const e = easeInOutCubic(t);
    camera.position.lerpVectors(a.fromPos, a.toPos, e);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.lerpVectors(a.fromTarget, a.toTarget, e);
      controls.update();
    }
    if (t >= 1) {
      anim.current = null;
      cameraStore.clearGoal();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.8}
      panSpeed={0.7}
      minDistance={2.2}
      maxDistance={26}
      maxPolarAngle={Math.PI / 2.05}
      minPolarAngle={0.15}
      makeDefault
    />
  );
}
