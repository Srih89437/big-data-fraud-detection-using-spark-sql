// Camera command store: lets UI buttons (outside the Canvas) drive camera
// animation without prop-drilling into the React Three Fiber tree.

import { useSyncExternalStore } from 'react';

export interface CameraGoal {
  /** Scene-space position to move the camera to. */
  position: [number, number, number];
  /** Scene-space point the camera looks at. */
  target: [number, number, number];
  /** Animation duration in seconds. */
  duration: number;
  /** Bump to re-trigger an identical goal. */
  nonce: number;
}

export type TourState = 'idle' | 'playing' | 'paused';

interface CameraStore {
  goal: CameraGoal | null;
  tour: TourState;
  tourIndex: number;
  tourSpeed: number;
}

let state: CameraStore = {
  goal: null,
  tour: 'idle',
  tourIndex: 0,
  tourSpeed: 1,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): CameraStore {
  return state;
}

function setState(patch: Partial<CameraStore>) {
  state = { ...state, ...patch };
  emit();
}

export const cameraStore = {
  subscribe,
  getSnapshot,
  flyTo(position: [number, number, number], target: [number, number, number], duration = 1.4) {
    setState({ goal: { position, target, duration, nonce: state.goal ? state.goal.nonce + 1 : 1 } });
  },
  clearGoal() {
    setState({ goal: null });
  },
  setTour(tour: TourState) {
    setState({ tour });
  },
  setTourIndex(tourIndex: number) {
    setState({ tourIndex, goal: null });
  },
  setTourSpeed(tourSpeed: number) {
    setState({ tourSpeed });
  },
};

export function useCameraStore(): CameraStore {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
