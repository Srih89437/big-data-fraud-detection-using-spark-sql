// Shared lazy wrapper so three.js + React Three Fiber are code-split into their
// own chunk and only downloaded when a section actually renders the map.

import { lazy } from 'react';

export const LazyIndiaMap3D = lazy(() =>
  import('./IndiaMap3D').then((m) => ({ default: m.IndiaMap3D })),
);
