import { useMemo, useState } from 'react';
import { LazyIndiaMap3D as IndiaMap3D } from '../../map/lazy';
import type { QueryResult } from '../types';

interface GeoPrism3DProps {
  data: QueryResult;
  dark?: boolean;
}

export function GeoPrism3D({ data, dark = true }: GeoPrism3DProps) {
  const records = data.points || (data as any).records || [];
  const meta = data.meta || (data as any).metadata || {};
  const geoCol = meta.x_col || 'state_ut';
  const valCol = meta.y_col || 'val';

  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Map custom records to Map<string, number>
  const casesMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      const stateName = String(r.x_label || r[geoCol] || '').trim();
      const val = r.y_val !== undefined ? Number(r.y_val) : Number(r[valCol] ?? 0);
      if (stateName) {
        map.set(stateName, val);
      }
    }
    return map;
  }, [records, geoCol, valCol]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <IndiaMap3D
        cases={casesMap}
        selected={selectedState}
        year={2024}
        dark={dark}
        compact
        metricName={valCol}
        onSelect={(name) => setSelectedState(name)}
      />

      {/* Metric Overlay Badge */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 8,
          padding: '6px 12px',
          color: '#f8fafc',
          fontSize: '11px',
          fontFamily: 'var(--font-mono, monospace)',
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 30,
        }}
      >
        <span style={{ color: '#94a3b8' }}>MAPPING METRIC: </span>
        <strong style={{ color: '#fbbf24' }}>{valCol}</strong>
        <span style={{ marginLeft: 8, color: '#38bdf8' }}>({casesMap.size} jurisdictions)</span>
      </div>
    </div>
  );
}
