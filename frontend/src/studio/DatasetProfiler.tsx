import { CheckCircle2, MapPin, Hash, Calendar, Type } from 'lucide-react';
import type { DatasetProfile } from './types';

interface DatasetProfilerProps {
  profile: DatasetProfile;
}

export function DatasetProfiler({ profile }: DatasetProfilerProps) {
  const { columns, row_count, column_count, filename } = profile;

  const getTypeIcon = (type: string, semantic: string) => {
    if (semantic === 'india_state_ut') return <MapPin size={12} className="type-icon-geo" />;
    if (type === 'numeric') return <Hash size={12} className="type-icon-num" />;
    if (type === 'datetime') return <Calendar size={12} className="type-icon-date" />;
    return <Type size={12} className="type-icon-text" />;
  };

  return (
    <div className="profiler-container">
      {/* Header Summary */}
      <div className="profiler-header">
        <div>
          <h3 className="profiler-title">{filename} · Statistical Schema Profiler</h3>
          <p className="profiler-subtitle">
            Autonomous type inference, null ratio checks, unique cardinality, and distribution analysis
          </p>
        </div>
        <div className="profiler-kpis">
          <div className="profiler-kpi-pill">
            <span>ROWS</span>
            <strong>{row_count.toLocaleString()}</strong>
          </div>
          <div className="profiler-kpi-pill">
            <span>COLUMNS</span>
            <strong>{column_count}</strong>
          </div>
        </div>
      </div>

      {/* Detailed Columns Table */}
      <div className="profiler-table-wrap">
        <table className="profiler-columns-table">
          <thead>
            <tr>
              <th>Column Name</th>
              <th>Data Type</th>
              <th>Semantic Role</th>
              <th>Nulls</th>
              <th>Unique Values</th>
              <th>Summary Statistics (Min / Mean / Max)</th>
              <th>Sample Data</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => (
              <tr key={col.name}>
                <td>
                  <strong className="col-name-label">{col.name}</strong>
                </td>
                <td>
                  <span className={`type-badge badge-${col.inferred_type}`}>
                    {getTypeIcon(col.inferred_type, col.semantic_type)}
                    <span>{col.inferred_type.toUpperCase()}</span>
                  </span>
                </td>
                <td>
                  <span className={`semantic-badge badge-sem-${col.semantic_type}`}>
                    {col.semantic_type === 'india_state_ut' ? '🇮🇳 JURISDICTION' : col.semantic_type.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div className="null-stat-wrap">
                    <span>
                      {col.null_count} ({col.null_percentage}%)
                    </span>
                    <div className="null-mini-bar">
                      <div
                        className="null-bar-fill"
                        style={{ width: `${Math.min(100, col.null_percentage)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td>
                  <span className="unique-count-label">
                    {col.unique_count.toLocaleString()}
                    <small>({(col.cardinality_ratio * 100).toFixed(1)}%)</small>
                  </span>
                </td>
                <td>
                  {col.inferred_type === 'numeric' && col.min !== undefined ? (
                    <div className="stats-triple-row">
                      <span>Min: <strong>{col.min.toLocaleString()}</strong></span>
                      <span>Avg: <strong>{col.mean?.toLocaleString()}</strong></span>
                      <span>Max: <strong>{col.max?.toLocaleString()}</strong></span>
                    </div>
                  ) : (
                    <span className="dim-text">—</span>
                  )}
                </td>
                <td>
                  <div className="samples-wrap">
                    {col.sample_values.slice(0, 3).map((val, sIdx) => (
                      <span key={sIdx} className="sample-pill">
                        {String(val)}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
